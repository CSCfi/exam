package util.java;

import akka.actor.ActorSystem;
import models.AutoEvaluationConfig;
import models.Exam;
import models.Grade;
import models.GradeEvaluation;
import models.User;
import org.joda.time.DateTime;
import play.Logger;
import scala.concurrent.duration.Duration;

import javax.inject.Inject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class AutoEvaluationHandlerImpl implements AutoEvaluationHandler {

    @Inject
    private EmailComposer composer;

    @Inject
    private ActorSystem actor;

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
                actor.scheduler().scheduleOnce(Duration.create(5, TimeUnit.SECONDS),
                        () -> composer.composeInspectionReady(student, null, exam, Collections.emptySet()),
                        actor.dispatcher());
                Logger.debug("Mail sent about automatic evaluation to {}", student.getEmail());
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
                Logger.info("Automatically grading exam #{}, {}/{} points ({}%) graded as {} using percentage threshold {}",
                        exam.getId(), totalScore, maxScore, percentage, grade.getName(), threshold);
                break;
            }
            prev = ge;
        }
        if (!exam.getGradeScale().getGrades().contains(grade)) {
            throw new RuntimeException("Grade in auto evaluation configuration not found in exam grade scale!");
        }
        return grade;
    }


}
