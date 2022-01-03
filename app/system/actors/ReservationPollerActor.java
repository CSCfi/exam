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
import javax.inject.Inject;
import models.ExamEnrolment;
import org.joda.time.DateTime;
import play.Logger;
import util.datetime.DateTimeUtils;

public class ReservationPollerActor extends AbstractActor {

    private static final Logger.ALogger logger = Logger.of(ReservationPollerActor.class);

    private NoShowHandler handler;

    @Inject
    public ReservationPollerActor(NoShowHandler handler) {
        this.handler = handler;
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder()
            .match(
                String.class,
                s -> {
                    logger.debug("Starting no-show check ->");
                    DateTime now = DateTimeUtils.adjustDST(DateTime.now());
                    List<ExamEnrolment> enrolments = Ebean
                        .find(ExamEnrolment.class)
                        .fetch("exam")
                        .fetch("collaborativeExam")
                        .fetch("externalExam")
                        .where()
                        .eq("noShow", false)
                        .or()
                        .lt("reservation.endAt", now)
                        .lt("examinationEventConfiguration.examinationEvent.start", now) // FIXME: exam duration
                        .endOr()
                        .isNull("reservation.externalReservation")
                        .findList();

                    if (enrolments.isEmpty()) {
                        logger.debug("None found");
                    } else {
                        handler.handleNoShows(enrolments);
                    }
                    logger.debug("<- done");
                }
            )
            .build();
    }
}
