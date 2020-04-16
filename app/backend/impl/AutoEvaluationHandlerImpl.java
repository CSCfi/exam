/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.impl;

import akka.actor.ActorSystem;
import backend.models.AutoEvaluationConfig;
import backend.models.Exam;
import backend.models.Grade;
import backend.models.GradeEvaluation;
import backend.models.GradeScale;
import backend.models.User;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import org.joda.time.DateTime;
import play.Logger;
import scala.concurrent.duration.Duration;

public class AutoEvaluationHandlerImpl implements AutoEvaluationHandler {
  private final EmailComposer composer;

  private final ActorSystem actor;

  private static final Logger.ALogger logger = Logger.of(AutoEvaluationHandlerImpl.class);

  @Inject
  public AutoEvaluationHandlerImpl(EmailComposer composer, ActorSystem actor) {
    this.composer = composer;
    this.actor = actor;
  }

  @Override
  public void autoEvaluate(Exam exam) {
    AutoEvaluationConfig config = exam.getAutoEvaluationConfig();
    if (config != null) {
      // Grade automatically
      process(exam);
      if (config.getReleaseType() == AutoEvaluationConfig.ReleaseType.IMMEDIATE) {
        // Notify student immediately
        exam.setAutoEvaluationNotified(DateTime.now());
        exam.update();
        User student = exam.getCreator();
        actor
          .scheduler()
          .scheduleOnce(
            Duration.create(5, TimeUnit.SECONDS),
            () -> composer.composeInspectionReady(student, null, exam),
            actor.dispatcher()
          );
        logger.debug("Mail sent about automatic evaluation to {}", student.getEmail());
      }
    }
  }

  private void process(Exam exam) {
    Grade grade = getGradeBasedOnScore(exam);
    if (grade != null) {
      exam.setGrade(grade);
      exam.setGradedTime(DateTime.now());
      exam.setCreditType(exam.getExamType());
      // NOTE: do not set graded by person here, one who makes a record will get the honor
      if (!exam.getExamLanguages().isEmpty()) {
        exam.setAnswerLanguage(exam.getExamLanguages().get(0).getCode());
      } else {
        throw new RuntimeException("No exam language found!");
      }
      exam.setState(Exam.State.GRADED);
      exam.update();
    }
  }

  private Optional<GradeScale> resolveScale(Exam exam) {
    if (exam.getGradeScale() != null) {
      return Optional.of(exam.getGradeScale());
    }
    if (exam.getCourse() != null && exam.getCourse().getGradeScale() != null) {
      return Optional.of(exam.getCourse().getGradeScale());
    }
    if (exam.getParent() != null && exam.getParent().getGradeScale() != null) {
      return Optional.of(exam.getParent().getGradeScale());
    } else if (exam.getParent() != null && exam.getParent().getCourse() != null) {
      GradeScale scale = exam.getParent().getCourse().getGradeScale();
      return scale == null ? Optional.empty() : Optional.of(scale);
    }
    return Optional.empty();
  }

  private Grade getGradeBasedOnScore(Exam exam) {
    Double totalScore = exam.getTotalScore();
    Double maxScore = exam.getMaxScore();
    Double percentage = maxScore == 0 ? 0 : totalScore * 100 / maxScore;
    List<GradeEvaluation> gradeEvaluations = new ArrayList<>(exam.getAutoEvaluationConfig().getGradeEvaluations());
    gradeEvaluations.sort(Comparator.comparingInt(GradeEvaluation::getPercentage));
    Grade grade = null;
    Iterator<GradeEvaluation> it = gradeEvaluations.iterator();
    GradeEvaluation prev = null;
    while (it.hasNext()) {
      GradeEvaluation ge = it.next();
      int threshold = 0;
      if (ge.getPercentage() > percentage) {
        grade = prev == null ? ge.getGrade() : prev.getGrade();
        threshold = prev == null ? ge.getPercentage() : prev.getPercentage();
      } else if (!it.hasNext()) {
        // Highest possible grade
        grade = ge.getGrade();
        threshold = ge.getPercentage();
      }
      if (grade != null) {
        logger.info(
          "Automatically grading exam #{}, {}/{} points ({}%) graded as {} using percentage threshold {}",
          exam.getId(),
          totalScore,
          maxScore,
          percentage,
          grade.getName(),
          threshold
        );
        break;
      }
      prev = ge;
    }
    Optional<GradeScale> scale = resolveScale(exam);
    if (scale.isEmpty() || !scale.get().getGrades().contains(grade)) {
      throw new RuntimeException("Grade in auto evaluation configuration not found in exam grade scale!");
    }
    return grade;
  }
}
