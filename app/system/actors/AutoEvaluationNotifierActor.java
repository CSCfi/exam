// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors;

import impl.EmailComposer;
import io.ebean.DB;
import java.util.Optional;
import javax.inject.Inject;
import models.AutoEvaluationConfig;
import models.Exam;
import models.User;
import org.apache.pekko.actor.AbstractActor;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import util.datetime.DateTimeHandler;

public class AutoEvaluationNotifierActor extends AbstractActor {

    private final Logger logger = LoggerFactory.getLogger(AutoEvaluationNotifierActor.class);

    private final EmailComposer composer;
    private final DateTimeHandler dateTimeHandler;

    @Inject
    public AutoEvaluationNotifierActor(EmailComposer composer, DateTimeHandler dateTimeHandler) {
        this.composer = composer;
        this.dateTimeHandler = dateTimeHandler;
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder()
            .match(
                String.class,
                s -> {
                    logger.debug("Auto evaluation notification check started ->");
                    DB
                        .find(Exam.class)
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
                    logger.debug("<- done");
                }
            )
            .build();
    }

    private DateTime adjustReleaseDate(DateTime date) {
        return dateTimeHandler.adjustDST(date.withHourOfDay(5).withMinuteOfHour(0).withSecondOfMinute(0));
    }

    private boolean isPastReleaseDate(Exam exam) {
        AutoEvaluationConfig config = exam.getAutoEvaluationConfig();
        Optional<DateTime> releaseDate =
            switch (config.getReleaseType()) {
                // Put some delay in these dates to avoid sending stuff in the middle of the night
                case GIVEN_DATE -> Optional.of(adjustReleaseDate(new DateTime(config.getReleaseDate())));
                case GIVEN_AMOUNT_DAYS -> Optional.of(
                    adjustReleaseDate(new DateTime(exam.getGradedTime()).plusDays(config.getAmountDays()))
                );
                case AFTER_EXAM_PERIOD -> Optional.of(adjustReleaseDate(new DateTime(exam.getPeriodEnd()).plusDays(1)));
                // Not handled at least by this actor
                default -> Optional.empty();
            };
        return releaseDate.isPresent() && releaseDate.get().isBeforeNow();
    }

    private void notifyStudent(Exam exam) {
        User student = exam.getCreator();
        try {
            composer.composeInspectionReady(student, null, exam);
            logger.debug("Mail sent to {}", student.getEmail());
            exam.setAutoEvaluationNotified(DateTime.now());
            exam.update();
        } catch (RuntimeException e) {
            logger.error("Sending mail to {} failed", student.getEmail());
        }
    }
}
