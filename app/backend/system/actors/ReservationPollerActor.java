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
import backend.impl.NoShowHandler;
import backend.models.Reservation;
import backend.util.datetime.DateTimeUtils;
import io.ebean.Ebean;
import java.util.List;
import javax.inject.Inject;
import org.joda.time.DateTime;
import play.Logger;

public class ReservationPollerActor extends AbstractActor {
  private static final Logger.ALogger logger = Logger.of(ReservationPollerActor.class);

  private NoShowHandler handler;

  @Inject
  public ReservationPollerActor(NoShowHandler handler) {
    this.handler = handler;
  }

  @Override
  public Receive createReceive() {
    // TODO: how about BYOD examinations and no-shows
    return receiveBuilder()
      .match(
        String.class,
        s -> {
          logger.debug("Starting no-show check ->");
          DateTime now = DateTimeUtils.adjustDST(DateTime.now());
          List<Reservation> reservations = Ebean
            .find(Reservation.class)
            .fetch("enrolment")
            .fetch("enrolment.exam")
            .fetch("enrolment.collaborativeExam")
            .fetch("enrolment.externalExam")
            .where()
            .eq("noShow", false)
            .lt("endAt", now.toDate())
            .isNull("externalReservation")
            .findList();

          if (reservations.isEmpty()) {
            logger.debug("None found");
          } else {
            handler.handleNoShows(reservations);
          }
          logger.debug("<- done");
        }
      )
      .build();
  }
}
