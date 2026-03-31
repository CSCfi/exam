// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.AutoEvaluationReleaseType
import models.exam.Exam
import models.exam.ExamState
import play.api.Logging
import services.mail.EmailComposer

import java.time.Instant
import java.time.ZoneOffset
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.util.control.Exception.catching

class AutoEvaluationNotifierService @Inject() (
    private val composer: EmailComposer
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  private def adjustReleaseDate(instant: Instant): Instant =
    instant.atZone(ZoneOffset.UTC).withHour(5).withMinute(0).withSecond(0).withNano(0).toInstant

  private def isPastReleaseDate(exam: Exam) =
    val config = exam.autoEvaluationConfig
    val releaseDate = config.releaseType match
      // Put some delay in these dates to avoid sending stuff in the middle of the night
      case AutoEvaluationReleaseType.GIVEN_DATE =>
        Some(adjustReleaseDate(config.releaseDate.toInstant))
      case AutoEvaluationReleaseType.GIVEN_AMOUNT_DAYS =>
        Some(adjustReleaseDate(
          exam.gradedTime.plus(java.time.Duration.ofDays(config.amountDays.toLong))
        ))
      case AutoEvaluationReleaseType.AFTER_EXAM_PERIOD =>
        Some(adjustReleaseDate(exam.periodEnd.plus(java.time.Duration.ofDays(1))))
      // Not handled at least by this service
      case _ => None
    releaseDate.exists(_.isBefore(Instant.now()))

  private def notifyStudent(exam: Exam): Unit =
    val student = exam.creator
    catching(classOf[RuntimeException]).either(
      composer.composeInspectionReady(student, None, exam)
    ) match
      case Left(e) => logger.error(s"Sending mail to ${student.email} failed", e)
      case Right(_) =>
        logger.info(s"Mail sent to ${student.email}")
        exam.autoEvaluationNotified = Instant.now()
        exam.update()

  private def runCheck(): IO[Unit] =
    IO.blocking {
      logger.info("Auto evaluation notification check started ->")
      DB.find(classOf[Exam])
        .fetch("autoEvaluationConfig")
        .where
        .eq("state", ExamState.GRADED)
        .isNotNull("gradedTime")
        .isNotNull("autoEvaluationConfig")
        .isNotNull("grade")
        .isNotNull("creditType")
        .isNotNull("answerLanguage")
        .isNull("autoEvaluationNotified")
        .list
        .filter(isPastReleaseDate)
        .foreach(notifyStudent)
      logger.info("<- done")
    }

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (60.seconds, 15.minutes)
    val job: IO[Unit] =
      runCheck().handleErrorWith(e => IO(logger.error("Error in auto evaluation notifier", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
