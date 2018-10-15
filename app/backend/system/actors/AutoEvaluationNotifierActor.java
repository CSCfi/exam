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

package backend.system.actors;

import java.util.Collections;
import java.util.Optional;
import javax.inject.Inject;

import akka.actor.AbstractActor;
import io.ebean.Ebean;
import org.joda.time.DateTime;
import play.Logger;

import backend.impl.EmailComposer;
import backend.models.AutoEvaluationConfig;
import backend.models.Exam;
import backend.models.User;
import backend.util.datetime.DateTimeUtils;

public class AutoEvaluationNotifierActor extends AbstractActor {

    private EmailComposer composer;

    @Inject
    public AutoEvaluationNotifierActor(EmailComposer composer) {
        this.composer = composer;
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder().match(String.class, s -> {
            Logger.debug("{}: Running auto evaluation notification check ...", getClass().getCanonicalName());
            Ebean.find(Exam.class)
                    .fetch("autoEvaluationConfig")
                    .where()
                    .eq("state", Exam.State.GRADED)
                    .isNotNull("gradedTime")
                    .isNotNull("autoEvaluationConfig")
                    .isNotNull("grade")
                    .isNotNull("creditType")
                    .isNotNull("answerLanguage")
                    .isNull("autoEvaluationNotified")
                    .findList()
                    .stream()
                    .filter(this::isPastReleaseDate)
                    .forEach(this::notifyStudent);
            Logger.debug("{}: ... Done", getClass().getCanonicalName());
        }).build();
    }

    private DateTime adjustReleaseDate(DateTime date) {
        return DateTimeUtils.adjustDST(date.withHourOfDay(5).withMinuteOfHour(0).withSecondOfMinute(0));
    }

    private boolean isPastReleaseDate(Exam exam) {
        Optional<DateTime> releaseDate;
        AutoEvaluationConfig config = exam.getAutoEvaluationConfig();
        switch (config.getReleaseType()) {
            // Put some delay in these dates to avoid sending stuff in the middle of the night
            case GIVEN_DATE:
                releaseDate = Optional.of(adjustReleaseDate(new DateTime(config.getReleaseDate())));
                break;
            case GIVEN_AMOUNT_DAYS:
                releaseDate = Optional.of(adjustReleaseDate(new DateTime(exam.getGradedTime()).plusDays(config.getAmountDays())));
                break;
            case AFTER_EXAM_PERIOD:
                releaseDate = Optional.of(adjustReleaseDate(new DateTime(exam.getExamActiveEndDate()).plusDays(1)));
                break;
            // Not handled at least by this actor
            case IMMEDIATE:
            case NEVER:
            default:
                releaseDate = Optional.empty();
                break;
        }
        return releaseDate.isPresent() && releaseDate.get().isBeforeNow();
    }

    private void notifyStudent(Exam exam) {
        User student = exam.getCreator();
        try {
            composer.composeInspectionReady(student, null, exam, Collections.emptySet());
            Logger.debug("{}: ... Mail sent to {}", getClass().getCanonicalName(), student.getEmail());
            exam.setAutoEvaluationNotified(DateTime.now());
            exam.update();
        } catch (RuntimeException e) {
            Logger.error("{}: ... Sending email to {} failed", getClass().getCanonicalName(), student.getEmail());
        }
    }

}
