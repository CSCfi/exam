// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.Reservation
import play.api.Logging
import services.mail.EmailComposer

import java.time.{Duration, Instant}
import javax.inject.Inject
import scala.concurrent.duration.*

class ReservationReminderService @Inject() (
    private val emailComposer: EmailComposer
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  private def remind(r: Reservation): Unit =
    emailComposer.composeReservationNotification(r.user, r, r.enrolment.exam, true)
    r.reminderSent = true
    r.update()

  private def runCheck(): IO[Unit] =
    IO.blocking {
      logger.info("Starting reservation reminder task ->")
      val now      = Instant.now()
      val tomorrow = now.plus(Duration.ofDays(1))
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
