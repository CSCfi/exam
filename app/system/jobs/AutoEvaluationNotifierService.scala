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
import org.joda.time.DateTime
import play.api.Logging
import services.datetime.DateTimeHandler
import services.mail.EmailComposer

import javax.inject.Inject
import scala.concurrent.duration.*
import scala.util.control.Exception.catching

class AutoEvaluationNotifierService @Inject() (
    private val composer: EmailComposer,
    private val dateTimeHandler: DateTimeHandler
) extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  private def adjustReleaseDate(date: DateTime) =
    dateTimeHandler.adjustDST(date.withHourOfDay(5).withMinuteOfHour(0).withSecondOfMinute(0))

  private def isPastReleaseDate(exam: Exam) =
    val config = exam.autoEvaluationConfig
    val releaseDate = config.releaseType match
      // Put some delay in these dates to avoid sending stuff in the middle of the night
      case AutoEvaluationReleaseType.GIVEN_DATE =>
        Some(adjustReleaseDate(new DateTime(config.releaseDate)))
      case AutoEvaluationReleaseType.GIVEN_AMOUNT_DAYS =>
        Some(adjustReleaseDate(new DateTime(exam.gradedTime).plusDays(config.amountDays)))
      case AutoEvaluationReleaseType.AFTER_EXAM_PERIOD =>
        Some(adjustReleaseDate(new DateTime(exam.periodEnd).plusDays(1)))
      // Not handled at least by this service
      case _ => None
    releaseDate.exists(_.isBeforeNow)

  private def notifyStudent(exam: Exam): Unit =
    val student = exam.creator
    catching(classOf[RuntimeException]).either(
      composer.composeInspectionReady(student, None, exam)
    ) match
      case Left(e) => logger.error(s"Sending mail to ${student.email} failed", e)
      case Right(_) =>
        logger.info(s"Mail sent to ${student.email}")
        exam.autoEvaluationNotified = DateTime.now
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
