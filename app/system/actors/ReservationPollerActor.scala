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
import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}

class ReservationPollerActor @Inject (
    private val noShowHandler: NoShowHandler,
    private val dateTimeHandler: DateTimeHandler,
    implicit val ec: ExecutionContext
) extends AbstractActor
    with Logging
    with DbApiHelper:

  private def isPast(ee: ExamEnrolment): Boolean =
    if ee.getExaminationEventConfiguration == null && ee.getReservation != null then
      val now = dateTimeHandler.adjustDST(DateTime.now)
      ee.getReservation.getEndAt.isBefore(now)
    else if ee.getExaminationEventConfiguration != null then
      val duration = ee.getExam.getDuration
      val start    = ee.getExaminationEventConfiguration.getExaminationEvent.getStart
      start.plusMinutes(duration).isBeforeNow
    else false

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
        else
          // Fire-and-forget: process asynchronously and log results
          noShowHandler.handleNoShows(enrolments, reservations).onComplete {
            case Success(_) =>
              logger.debug("No-show processing completed")
            case Failure(e) =>
              logger.error("Error processing no-shows", e)
          }
        logger.debug("<- done")
    )
    .build
