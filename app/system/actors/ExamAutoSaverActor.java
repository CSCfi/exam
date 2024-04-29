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

package system.actors;

import controllers.SettingsController;
import impl.EmailComposer;
import io.ebean.DB;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import javax.inject.Inject;
import models.Exam;
import models.ExamEnrolment;
import models.ExamInspection;
import models.ExamParticipation;
import models.ExaminationEvent;
import models.GeneralSettings;
import models.Reservation;
import models.User;
import models.json.ExternalExam;
import org.apache.pekko.actor.AbstractActor;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import util.AppUtil;
import util.datetime.DateTimeHandler;

public class ExamAutoSaverActor extends AbstractActor {

    private final Logger logger = LoggerFactory.getLogger(ExamAutoSaverActor.class);

    private final EmailComposer composer;
    private final DateTimeHandler dateTimeHandler;

    @Inject
    public ExamAutoSaverActor(EmailComposer composer, DateTimeHandler dateTimeHandler) {
        this.composer = composer;
        this.dateTimeHandler = dateTimeHandler;
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder()
            .match(String.class, s -> {
                logger.debug("Starting check for ongoing exams ->");
                checkLocalExams();
                checkExternalExams();
                logger.debug("<- done");
            })
            .build();
    }

    private void checkLocalExams() {
        List<ExamParticipation> participations = DB.find(ExamParticipation.class)
            .fetch("exam")
            .fetch("reservation")
            .fetch("reservation.machine.room")
            .fetch("examinationEvent")
            .where()
            .isNull("ended")
            .or()
            .isNotNull("reservation")
            .isNotNull("examinationEvent")
            .endOr()
            .findList();

        if (participations.isEmpty()) {
            logger.debug("None found");
            return;
        }
        markEnded(participations);
    }

    private DateTime getNow(ExamParticipation participation) {
        if (participation.getExaminationEvent() != null) {
            return DateTime.now();
        }
        Reservation reservation = participation.getReservation();
        return dateTimeHandler.adjustDST(DateTime.now(), reservation.getMachine().getRoom());
    }

    private void markEnded(List<ExamParticipation> participations) {
        for (ExamParticipation participation : participations) {
            Exam exam = participation.getExam();
            Reservation reservation = participation.getReservation();
            ExaminationEvent event = participation.getExaminationEvent();
            DateTime reservationStart = new DateTime(reservation == null ? event.getStart() : reservation.getStartAt());
            DateTime participationTimeLimit = reservationStart.plusMinutes(exam.getDuration());
            DateTime now = getNow(participation);
            if (participationTimeLimit.isBefore(now)) {
                participation.setEnded(now);
                participation.setDuration(
                    new DateTime(participation.getEnded().getMillis() - participation.getStarted().getMillis())
                );

                GeneralSettings settings = SettingsController.getOrCreateSettings("review_deadline", null, "14");
                int deadlineDays = Integer.parseInt(settings.getValue());
                DateTime deadline = new DateTime(participation.getEnded()).plusDays(deadlineDays);
                participation.setDeadline(deadline);

                participation.save();
                logger.info("Setting exam {} state to REVIEW", exam.getId());
                exam.setState(Exam.State.REVIEW);
                exam.save();
                if (exam.isPrivate()) {
                    // Notify teachers
                    Set<User> recipients = new HashSet<>();
                    recipients.addAll(exam.getParent().getExamOwners());
                    recipients.addAll(
                        exam.getExamInspections().stream().map(ExamInspection::getUser).collect(Collectors.toSet())
                    );
                    AppUtil.notifyPrivateExamEnded(recipients, exam, composer);
                }
            } else {
                logger.info("Exam {} is ongoing until {}", exam.getId(), participationTimeLimit);
            }
        }
    }

    private void checkExternalExams() {
        List<ExamEnrolment> enrolments = DB.find(ExamEnrolment.class)
            .fetch("externalExam")
            .fetch("reservation")
            .fetch("reservation.machine.room")
            .where()
            .isNotNull("externalExam")
            .isNotNull("externalExam.started")
            .isNull("externalExam.finished")
            .isNotNull("reservation.externalRef")
            .findList();
        for (ExamEnrolment enrolment : enrolments) {
            ExternalExam exam = enrolment.getExternalExam();
            Exam content;
            try {
                content = exam.deserialize();
            } catch (IOException e) {
                logger.error("Failed to parse content out of an external exam", e);
                continue;
            }
            Reservation reservation = enrolment.getReservation();
            DateTime reservationStart = new DateTime(reservation.getStartAt());
            DateTime participationTimeLimit = reservationStart.plusMinutes(content.getDuration());
            DateTime now = dateTimeHandler.adjustDST(DateTime.now(), reservation.getMachine().getRoom());
            if (participationTimeLimit.isBefore(now)) {
                exam.setFinished(now);
                content.setState(Exam.State.REVIEW);
                try {
                    exam.serialize(content);
                    logger.info("Setting external exam {} state to REVIEW", exam.getHash());
                } catch (IOException e) {
                    logger.error("failed to parse content out of an external exam", e);
                }
            }
        }
    }
}
