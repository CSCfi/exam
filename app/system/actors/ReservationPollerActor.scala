// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import impl.NoShowHandler
import io.ebean.DB
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.DbApiHelper
import models.enrolment.{ExamEnrolment, Reservation}
import org.apache.pekko.actor.AbstractActor
import org.joda.time.DateTime
import play.api.Logging

import javax.inject.Inject

class ReservationPollerActor @Inject (
    private val noShowHandler: NoShowHandler,
    private val dateTimeHandler: DateTimeHandler
) extends AbstractActor
    with Logging
    with DbApiHelper:

  private def isPast(ee: ExamEnrolment): Boolean =
    (Option(ee.getExaminationEventConfiguration), Option(ee.getReservation)) match
      case (None, Some(reservation)) =>
        val now = dateTimeHandler.adjustDST(DateTime.now)
        reservation.getEndAt.isBefore(now)
      case (Some(config), _) =>
        val duration = ee.getExam.getDuration
        val start    = config.getExaminationEvent.getStart
        start.plusMinutes(duration).isBeforeNow
      case _ => false

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (_: String) =>
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

        // The following are cases where an external user has made a reservation but did not log in before
        // the reservation ended. Mark those as no-shows as well.
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
        else noShowHandler.handleNoShows(enrolments, reservations)
        logger.debug("<- done")
    )
    .build
