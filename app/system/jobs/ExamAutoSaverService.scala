// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.{Exam, ExamState}
import org.joda.time.DateTime
import play.api.Logging
import services.config.ConfigReader
import services.datetime.DateTimeHandler
import services.mail.EmailComposer

import java.io.IOException
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.control.Exception.catching

class ExamAutoSaverService @Inject() (
    private val composer: EmailComposer,
    private val configReader: ConfigReader,
    private val dateTimeHandler: DateTimeHandler
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  // The adjustment falls back to the default time zone when the reservation has no machine
  private def getNow(participation: ExamParticipation) =
    if Option(participation.examinationEvent).nonEmpty then DateTime.now
    else dateTimeHandler.adjustDST(DateTime.now, participation.reservation)

  private def reviewDeadlineDays: Int =
    configReader.getOrCreateSettings("review_deadline", None, Some("14")).value.toInt

  private def markEnded(participation: ExamParticipation, deadlineDays: Int): Unit =
    val exam        = participation.exam
    val reservation = participation.reservation
    val event       = participation.examinationEvent
    val reservationStart = new DateTime(
      if Option(reservation).isEmpty then event.start
      else reservation.startAt
    )
    val participationTimeLimit = reservationStart.plusMinutes(exam.duration)
    val now                    = getNow(participation)
    if participationTimeLimit.isBefore(now) then
      participation.ended = now
      participation.duration =
        new DateTime(participation.ended.getMillis - participation.started.getMillis)
      participation.deadline = new DateTime(participation.ended).plusDays(deadlineDays)
      participation.save()
      logger.info(s"Setting exam ${exam.id} state to REVIEW")
      exam.state = ExamState.REVIEW
      exam.save()
      if exam.isPrivate then notifyTeachers(exam)
    else logger.info(s"Exam ${exam.id} is ongoing until $participationTimeLimit")

  // The exam has already ended, so a failed email only skips that teacher
  private def notifyTeachers(exam: Exam): Unit =
    val recipients = exam.parent.examOwners.asScala ++ exam.examInspections.asScala.map(_.user)
    recipients.foreach(r =>
      catching(classOf[RuntimeException]).either(composer.composePrivateExamEnded(r, exam)) match
        case Left(e)  => logger.error(s"Failed to notify ${r.email} of exam ${exam.id} ending", e)
        case Right(_) => logger.info(s"Email sent to ${r.email}")
    )

  // Each participation is handled on its own, so one that fails cannot keep the ones after it
  // from ending
  private def checkLocalExams(): IO[Unit] =
    IO.blocking {
      val participants = DB
        .find(classOf[ExamParticipation])
        .fetch("exam")
        .fetch("reservation")
        .fetch("reservation.machine.room")
        .fetch("examinationEvent")
        .where
        .isNull("ended")
        .or
        .isNotNull("reservation")
        .isNotNull("examinationEvent")
        .endOr
        .list
      (participants, if participants.isEmpty then 0 else reviewDeadlineDays)
    }.flatMap { (participants, deadlineDays) =>
      if participants.isEmpty then IO(logger.info("None found"))
      else
        participants.traverse_(p =>
          IO.blocking(markEnded(p, deadlineDays)).handleErrorWith(e =>
            IO(logger.error(s"Failed to check whether participation ${p.id} has ended", e))
          )
        )
    }

  private def checkExternalExams(): IO[Unit] =
    IO.blocking {
      DB
        .find(classOf[ExamEnrolment])
        .fetch("externalExam")
        .fetch("reservation")
        .fetch("reservation.machine.room")
        .where
        .isNotNull("externalExam")
        .isNotNull("externalExam.started")
        .isNull("externalExam.finished")
        .isNotNull("reservation.externalRef")
        .list
    }.flatMap(_.traverse_(enrolment =>
      IO.blocking(markExternalEnded(enrolment)).handleErrorWith(e =>
        IO(logger.error(
          s"Failed to check whether external exam of enrolment ${enrolment.id} has ended",
          e
        ))
      )
    ))

  private def markExternalEnded(enrolment: ExamEnrolment): Unit =
    catching(classOf[IOException]).either(enrolment.externalExam.deserialize) match
      case Left(e) => logger.error("Failed to parse content out of an external exam", e)
      case Right(content) =>
        val (exam, reservation)    = (enrolment.externalExam, enrolment.reservation)
        val reservationStart       = new DateTime(reservation.startAt)
        val participationTimeLimit = reservationStart.plusMinutes(content.duration)
        val now                    = dateTimeHandler.adjustDST(DateTime.now, reservation)
        if participationTimeLimit.isBefore(now) then
          exam.finished = now
          content.state = ExamState.REVIEW
          catching(classOf[IOException]).either(exam.serialize(content)) match
            case Left(e)  => logger.error("failed to parse content out of an external exam", e)
            case Right(_) => logger.info(s"Setting external exam ${exam.hash} state to REVIEW")

  // Visible for tests
  def runCheck(): IO[Unit] =
    IO(logger.info("Starting check for ongoing exams ->")) *>
      checkLocalExams() *>
      checkExternalExams() *>
      IO(logger.info("<- done"))

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (15.seconds, 1.minutes)
    val job: IO[Unit] =
      runCheck().handleErrorWith(e => IO(logger.error("Error in exam auto saver", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
