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

import akka.actor.AbstractActor;
import io.ebean.Ebean;
import backend.models.Reservation;
import org.joda.time.DateTime;
import play.Logger;
import backend.util.AppUtil;
import backend.impl.EmailComposer;

import javax.inject.Inject;

public class ReservationReminderActor extends AbstractActor {

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
            Logger.debug("{}: Running reservation reminder task ...", getClass().getCanonicalName());
            DateTime now = AppUtil.adjustDST(DateTime.now());
            DateTime tomorrow = now.plusDays(1);
            Ebean.find(Reservation.class)
                    .where()
                    .between("startAt", now, tomorrow)
                    .ne("reminderSent", true)
                    .findList()
                    .forEach(this::remind);
            Logger.debug("{}: Reservation reminder task done", getClass().getCanonicalName());

        }).build();
    }

}
