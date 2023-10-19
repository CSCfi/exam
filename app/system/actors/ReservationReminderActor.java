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

import impl.EmailComposer;
import io.ebean.DB;
import javax.inject.Inject;
import models.Reservation;
import org.apache.pekko.actor.AbstractActor;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import util.datetime.DateTimeHandler;

public class ReservationReminderActor extends AbstractActor {

    private final Logger logger = LoggerFactory.getLogger(ReservationReminderActor.class);

    private final EmailComposer emailComposer;
    private final DateTimeHandler dateTimeHandler;

    @Inject
    public ReservationReminderActor(EmailComposer emailComposer, DateTimeHandler dateTimeHandler) {
        this.emailComposer = emailComposer;
        this.dateTimeHandler = dateTimeHandler;
    }

    private void remind(Reservation r) {
        emailComposer.composeReservationNotification(r.getUser(), r, r.getEnrolment().getExam(), true);
        r.setReminderSent(true);
        r.update();
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder()
            .match(
                String.class,
                s -> {
                    logger.debug("Starting reservation reminder task ->");
                    DateTime now = dateTimeHandler.adjustDST(DateTime.now());
                    DateTime tomorrow = now.plusDays(1);
                    DB
                        .find(Reservation.class)
                        .fetch("enrolment.optionalSections")
                        .fetch("enrolment.optionalSections.examMaterials")
                        .fetch("enrolment")
                        .fetch("enrolment.exam.examSections")
                        .fetch("enrolment.exam.examSections.examMaterials")
                        .where()
                        .isNotNull("enrolment.exam")
                        .between("startAt", now, tomorrow)
                        .ne("reminderSent", true)
                        .findList()
                        .forEach(this::remind);
                    logger.debug("<- done");
                }
            )
            .build();
    }
}
