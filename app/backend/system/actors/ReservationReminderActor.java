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

import javax.inject.Inject;

import akka.actor.AbstractActor;
import io.ebean.Ebean;
import org.joda.time.DateTime;
import play.Logger;

import backend.impl.EmailComposer;
import backend.models.Reservation;
import backend.util.datetime.DateTimeUtils;

public class ReservationReminderActor extends AbstractActor {

    private static final Logger.ALogger logger = Logger.of(ReservationReminderActor.class);

    private EmailComposer emailComposer;

    @Inject
    public ReservationReminderActor(EmailComposer emailComposer) {
        this.emailComposer = emailComposer;
    }

    private void remind(Reservation r) {
        emailComposer.composeReservationNotification(
                r.getUser(), r, r.getEnrolment().getExam(), true);
        r.setReminderSent(true);
        r.update();
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder().match(String.class, s -> {
            logger.debug("Starting reservation reminder task ->");
            DateTime now = DateTimeUtils.adjustDST(DateTime.now());
            DateTime tomorrow = now.plusDays(1);
            Ebean.find(Reservation.class)
                    .fetch("optionalSections")
                    .fetch("optionalSections.examMaterials")
                    .fetch("enrolment")
                    .fetch("enrolment.exam.examSections")
                    .fetch("enrolment.exam.examSections.examMaterials")
                    .where()
                    .between("startAt", now, tomorrow)
                    .ne("reminderSent", true)
                    .findList()
                    .forEach(this::remind);
            logger.debug("<- done");

        }).build();
    }

}
