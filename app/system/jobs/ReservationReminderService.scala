// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all._
import io.ebean.DB
import database.EbeanQueryExtensions
import models.enrolment.Reservation
import org.joda.time.DateTime
import play.api.Logging
import services.datetime.DateTimeHandler
import services.mail.EmailComposer

import javax.inject.Inject
import scala.concurrent.duration._

class ReservationReminderService @Inject() (
    private val emailComposer: EmailComposer,
    private val dateTimeHandler: DateTimeHandler
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  private def remind(r: Reservation): Unit =
    emailComposer.composeReservationNotification(r.getUser, r, r.getEnrolment.getExam, true)
    r.setReminderSent(true)
    r.update()

  private def runCheck(): IO[Unit] =
    IO.blocking {
      logger.info("Starting reservation reminder task ->")
      val now      = dateTimeHandler.adjustDST(DateTime.now)
      val tomorrow = now.plusDays(1)
      DB.find(classOf[Reservation])
        .fetch("enrolment.optionalSections")
        .fetch("enrolment.optionalSections.examMaterials")
        .fetch("enrolment")
        .fetch("enrolment.exam.examSections")
        .fetch("enrolment.exam.examSections.examMaterials")
        .where
        .isNotNull("enrolment.exam")
        .between("startAt", now, tomorrow)
        .ne("reminderSent", true)
        .list
        .foreach(remind)
      logger.info("<- done")
    }

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (90.seconds, 10.minutes)
    val job: IO[Unit] =
      runCheck().handleErrorWith(e => IO(logger.error("Error in reservation reminder", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
