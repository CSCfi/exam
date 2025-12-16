// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all._
import io.ebean.DB
import database.EbeanQueryExtensions
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.Exam
import org.joda.time.DateTime
import play.api.Logging
import services.config.ConfigReader
import services.datetime.DateTimeHandler
import services.mail.EmailComposer

import java.io.IOException
import javax.inject.Inject
import scala.concurrent.duration._
import scala.jdk.CollectionConverters._
import scala.util.control.Exception.catching

class ExamAutoSaverService @Inject() (
    private val composer: EmailComposer,
    private val configReader: ConfigReader,
    private val dateTimeHandler: DateTimeHandler
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  private def getNow(participation: ExamParticipation) =
    if Option(participation.getExaminationEvent).nonEmpty then DateTime.now
    else
      val reservation = participation.getReservation
      dateTimeHandler.adjustDST(DateTime.now, reservation.getMachine.getRoom)

  private def markEnded(participants: List[ExamParticipation]): Unit =
    participants.foreach(participation =>
      val exam        = participation.getExam
      val reservation = participation.getReservation
      val event       = participation.getExaminationEvent
      val reservationStart = new DateTime(
        if Option(reservation).isEmpty then event.getStart
        else reservation.getStartAt
      )
      val participationTimeLimit = reservationStart.plusMinutes(exam.getDuration)
      val now                    = getNow(participation)
      if participationTimeLimit.isBefore(now) then
        participation.setEnded(now)
        participation.setDuration(new DateTime(participation.getEnded.getMillis - participation.getStarted.getMillis))
        val settings     = configReader.getOrCreateSettings("review_deadline", None, Some("14"))
        val deadlineDays = settings.getValue.toInt
        val deadline     = new DateTime(participation.getEnded).plusDays(deadlineDays)
        participation.setDeadline(deadline)
        participation.save()
        logger.info(s"Setting exam ${exam.getId} state to REVIEW")
        exam.setState(Exam.State.REVIEW)
        exam.save()
        if exam.isPrivate then
          // Notify teachers
          val recipients = exam.getParent.getExamOwners.asScala ++ exam.getExamInspections.asScala.map(_.getUser)
          recipients.foreach(r =>
            composer.composePrivateExamEnded(r, exam)
            logger.info(s"Email sent to ${r.getEmail}")
          )
      else logger.info(s"Exam ${exam.getId} is ongoing until $participationTimeLimit")
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
          catching(classOf[IOException]).either(enrolment.getExternalExam.deserialize()) match
            case Left(e) =>
              logger.error("Failed to parse content out of an external exam", e)
              None
            case Right(content) => Some((enrolment, content))
        )
        .foreach((enrolment, content) =>
          val (exam, reservation)    = (enrolment.getExternalExam, enrolment.getReservation)
          val reservationStart       = new DateTime(reservation.getStartAt)
          val participationTimeLimit = reservationStart.plusMinutes(content.getDuration)
          val now                    = dateTimeHandler.adjustDST(DateTime.now, reservation.getMachine.getRoom)
          if participationTimeLimit.isBefore(now) then
            exam.setFinished(now)
            content.setState(Exam.State.REVIEW)
            catching(classOf[IOException]).either(exam.serialize(content)) match
              case Left(e)  => logger.error("failed to parse content out of an external exam", e)
              case Right(_) => logger.info(s"Setting external exam ${exam.getHash} state to REVIEW")
        )
    }

  private def runCheck(): IO[Unit] =
    IO(logger.info("Starting check for ongoing exams ->")) *>
      checkLocalExams() *>
      checkExternalExams() *>
      IO(logger.info("<- done"))

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (15.seconds, 1.minutes)
    val job: IO[Unit]     = runCheck().handleErrorWith(e => IO(logger.error("Error in exam auto saver", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
