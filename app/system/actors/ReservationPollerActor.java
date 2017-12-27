/*
 * Copyright (c) 2017 Exam Consortium
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

import akka.actor.AbstractActor;
import io.ebean.Ebean;
import models.Reservation;
import org.joda.time.DateTime;
import play.Logger;
import util.AppUtil;
import impl.NoShowHandler;

import javax.inject.Inject;
import java.util.List;

public class ReservationPollerActor extends AbstractActor {

    private NoShowHandler handler;

    @Inject
    public ReservationPollerActor(NoShowHandler handler) {
        this.handler = handler;
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder().match(String.class, s -> {
            Logger.debug("{}: Running no-show check ...", getClass().getCanonicalName());
            DateTime now = AppUtil.adjustDST(DateTime.now());
            List<Reservation> reservations = Ebean.find(Reservation.class)
                    .fetch("enrolment")
                    .fetch("enrolment.exam")
                    .fetch("enrolment.externalExam")
                    .where()
                    .eq("noShow", false)
                    .lt("endAt", now.toDate())
                    .isNull("externalReservation")
                    .findList();

            if (reservations.isEmpty()) {
                Logger.debug("{}: ... none found.", getClass().getCanonicalName());
            } else {
                handler.handleNoShows(reservations);
            }

        }).build();
    }

}
