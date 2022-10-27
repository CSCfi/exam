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

import akka.actor.AbstractActor;
import impl.NoShowHandler;
import io.ebean.Ebean;
import java.util.List;
import java.util.stream.Collectors;
import javax.inject.Inject;
import models.ExamEnrolment;
import models.Reservation;
import org.joda.time.DateTime;
import play.Logger;
import util.datetime.DateTimeHandler;

public class ReservationPollerActor extends AbstractActor {

    private static final Logger.ALogger logger = Logger.of(ReservationPollerActor.class);

    private final NoShowHandler noShowHandler;
    private final DateTimeHandler dateTimeHandler;

    @Inject
    public ReservationPollerActor(NoShowHandler noShowHandler, DateTimeHandler dateTimeHandler) {
        this.noShowHandler = noShowHandler;
        this.dateTimeHandler = dateTimeHandler;
    }

    private boolean isPast(ExamEnrolment ee) {
        DateTime now = dateTimeHandler.adjustDST(DateTime.now());
        if (ee.getExaminationEventConfiguration() == null && ee.getReservation() != null) {
            return ee.getReservation().getEndAt().isAfter(now);
        } else if (ee.getExaminationEventConfiguration() != null) {
            int duration = ee.getExam().getDuration();
            DateTime start = ee.getExaminationEventConfiguration().getExaminationEvent().getStart();
            return start.plusMinutes(duration).isAfter(now);
        }
        return false;
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder()
            .match(
                String.class,
                s -> {
                    logger.debug("Starting no-show check ->");
                    List<ExamEnrolment> enrolments = Ebean
                        .find(ExamEnrolment.class)
                        .fetch("exam")
                        .fetch("collaborativeExam")
                        .fetch("externalExam")
                        .fetch("reservation")
                        .fetch("examinationEventConfiguration.examinationEvent")
                        .where()
                        .eq("noShow", false)
                        .isNull("reservation.externalReservation")
                        .findList()
                        .stream()
                        .filter(this::isPast)
                        .collect(Collectors.toList());
                    // The following are cases where external user has made a reservation but did not log in before
                    // reservation ended. Mark those as no-shows as well.
                    List<Reservation> reservations = Ebean
                        .find(Reservation.class)
                        .where()
                        .isNull("enrolment")
                        .isNotNull("externalRef")
                        .isNull("user")
                        .isNotNull("externalUserRef")
                        .lt("endAt", dateTimeHandler.adjustDST(DateTime.now()))
                        .findList();
                    if (enrolments.isEmpty() && reservations.isEmpty()) {
                        logger.debug("None found");
                    } else {
                        noShowHandler.handleNoShows(enrolments, reservations);
                    }
                    logger.debug("<- done");
                }
            )
            .build();
    }
}
