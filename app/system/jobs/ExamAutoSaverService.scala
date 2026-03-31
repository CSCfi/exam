// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.ExamState
import play.api.Logging
import services.config.ConfigReader
import services.mail.EmailComposer

import java.io.IOException
import java.time.{Duration, Instant}
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.control.Exception.catching

class ExamAutoSaverService @Inject() (
    private val composer: EmailComposer,
    private val configReader: ConfigReader
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  private def markEnded(participants: List[ExamParticipation]): Unit =
    participants.foreach(participation =>
      val exam        = participation.exam
      val reservation = participation.reservation
      val event       = participation.examinationEvent
      val reservationStart =
        if Option(reservation).isEmpty then event.start else reservation.startAt
      val participationTimeLimit = reservationStart.plus(Duration.ofMinutes(exam.duration.toLong))
      if participationTimeLimit.isBefore(Instant.now()) then
        participation.ended = Instant.now()
        participation.duration =
          Instant.ofEpochMilli(
            participation.ended.toEpochMilli - participation.started.toEpochMilli
          )

        val settings     = configReader.getOrCreateSettings("review_deadline", None, Some("14"))
        val deadlineDays = settings.value.toInt
        val deadline     = participation.ended.plus(Duration.ofDays(deadlineDays))
        participation.deadline = deadline
        participation.save()
        logger.info(s"Setting exam ${exam.id} state to REVIEW")
        exam.state = ExamState.REVIEW
        exam.save()
        if exam.isPrivate then
          // Notify teachers
          val recipients =
            exam.parent.examOwners.asScala ++ exam.examInspections.asScala.map(_.user)
          recipients.foreach(r =>
            composer.composePrivateExamEnded(r, exam)
            logger.info(s"Email sent to ${r.email}")
          )
      else logger.info(s"Exam ${exam.id} is ongoing until $participationTimeLimit")
    )

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
      if participants.isEmpty then logger.info("None found")
      else markEnded(participants)
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
        .flatMap(enrolment =>
          catching(classOf[IOException]).either(enrolment.externalExam.deserialize) match
            case Left(e) =>
              logger.error("Failed to parse content out of an external exam", e)
              None
            case Right(content) => Some((enrolment, content))
        )
        .foreach((enrolment, content) =>
          val (exam, reservation) = (enrolment.externalExam, enrolment.reservation)
          val participationTimeLimit =
            reservation.startAt.plus(Duration.ofMinutes(content.duration.toLong))
          if participationTimeLimit.isBefore(Instant.now()) then
            exam.finished = Instant.now()
            content.state = ExamState.REVIEW
            catching(classOf[IOException]).either(exam.serialize(content)) match
              case Left(e)  => logger.error("failed to parse content out of an external exam", e)
              case Right(_) => logger.info(s"Setting external exam ${exam.hash} state to REVIEW")
        )
    }

  private def runCheck(): IO[Unit] =
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
