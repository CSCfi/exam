// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.{ExamEnrolment, Reservation}
import org.joda.time.DateTime
import play.api.Logging
import services.datetime.DateTimeHandler
import services.enrolment.NoShowHandler

import javax.inject.Inject
import scala.concurrent.duration.*

class ReservationPollerService @Inject() (
    private val noShowHandler: NoShowHandler,
    private val dateTimeHandler: DateTimeHandler
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  private def isPast(ee: ExamEnrolment): Boolean =
    (Option(ee.examinationEventConfiguration), Option(ee.reservation)) match
      case (None, Some(reservation)) =>
        val now = dateTimeHandler.adjustDST(DateTime.now)
        reservation.endAt.isBefore(now)
      case (Some(config), _) =>
        val duration = ee.exam.duration
        val start    = config.examinationEvent.start
        start.plusMinutes(duration).isBeforeNow
      case _ => false

  private def runCheck(): IO[Unit] =
    IO.blocking {
      logger.info("Starting no-show check ->")
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

      if enrolments.isEmpty && reservations.isEmpty then
        logger.info("No-show check completed: None found")
      else noShowHandler.handleNoShows(enrolments, reservations)
      logger.info("<- done")
    }

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (30.seconds, 60.minutes)
    val job: IO[Unit] =
      runCheck().handleErrorWith(e => IO(logger.error("Error in reservation poller", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
