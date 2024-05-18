/*
 *
 *  * Copyright (c) 2024 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *  *
 *  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  * versions of the EUPL (the "Licence");
 *  * You may not use this work except in compliance with the Licence.
 *  * You may obtain a copy of the Licence at:
 *  *
 *  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */

package system.actors

import impl.NoShowHandler
import io.ebean.DB

import javax.inject.Inject
import models.ExamEnrolment
import models.Reservation
import org.apache.pekko.actor.AbstractActor
import org.joda.time.DateTime
import play.api.Logging
import util.datetime.DateTimeHandler
import util.scala.DbApiHelper

import scala.jdk.CollectionConverters.*

class ReservationPollerActor @Inject (
    private val noShowHandler: NoShowHandler,
    private val dateTimeHandler: DateTimeHandler
) extends AbstractActor
    with Logging
    with DbApiHelper:

  private def isPast(ee: ExamEnrolment): Boolean =
    val now = dateTimeHandler.adjustDST(DateTime.now)
    if (ee.getExaminationEventConfiguration == null && ee.getReservation != null)
      return ee.getReservation.getEndAt.isBefore(now)
    else if (ee.getExaminationEventConfiguration != null) {
      val duration = ee.getExam.getDuration
      val start    = ee.getExaminationEventConfiguration.getExaminationEvent.getStart
      return start.plusMinutes(duration).isBefore(now)
    }
    false

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (s: String) =>
        logger.debug("Starting no-show check ->")
        val enrolments = DB
          .find(classOf[ExamEnrolment])
          .fetch("exam")
          .fetch("collaborativeExam")
          .fetch("externalExam")
          .fetch("reservation")
          .fetch("examinationEventConfiguration.examinationEvent")
          .where
          .eq("noShow", false)
          .isNull("reservation.externalReservation")
          .list
          .filter(isPast)

        // The following are cases where external user has made a reservation but did not log in before
        // reservation ended. Mark those as no-shows as well.
        val reservations = DB
          .find(classOf[Reservation])
          .where
          .isNull("enrolment")
          .isNotNull("externalRef")
          .isNull("user")
          .isNotNull("externalUserRef")
          .eq("sentAsNoShow", false)
          .lt("endAt", dateTimeHandler.adjustDST(DateTime.now))
          .list
        if enrolments.isEmpty && reservations.isEmpty then logger.debug("None found")
        else noShowHandler.handleNoShows(enrolments.asJava, reservations.asJava)
        logger.debug("<- done")
    )
    .build
