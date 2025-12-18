// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.actors

import impl.mail.EmailComposer
import io.ebean.DB
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.DbApiHelper
import models.assessment.AutoEvaluationConfig.ReleaseType
import models.exam.Exam
import org.apache.pekko.actor.{AbstractActor, ActorSystem}
import org.joda.time.DateTime
import play.api.Logging

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.concurrent.duration.*
import scala.util.control.Exception.catching

class AutoEvaluationNotifierActor @Inject (
    private val composer: EmailComposer,
    private val dateTimeHandler: DateTimeHandler,
    private val actorSystem: ActorSystem,
    implicit val ec: ExecutionContext
) extends AbstractActor
    with Logging
    with DbApiHelper:

  override def createReceive(): AbstractActor.Receive = receiveBuilder()
    .`match`(
      classOf[String],
      (_: String) =>
        logger.debug("Auto evaluation notification check started ->")
        DB.find(classOf[Exam])
          .fetch("autoEvaluationConfig")
          .where
          .eq("state", Exam.State.GRADED)
          .isNotNull("gradedTime")
          .isNotNull("autoEvaluationConfig")
          .isNotNull("grade")
          .isNotNull("creditType")
          .isNotNull("answerLanguage")
          .isNull("autoEvaluationNotified")
          .list
          .filter(isPastReleaseDate)
          .foreach(notifyStudent)
        logger.debug("<- done")
    )
    .build

  private def adjustReleaseDate(date: DateTime) =
    dateTimeHandler.adjustDST(date.withHourOfDay(5).withMinuteOfHour(0).withSecondOfMinute(0))

  private def isPastReleaseDate(exam: Exam) =
    val config = exam.getAutoEvaluationConfig
    val releaseDate = config.getReleaseType match
      // Put some delay in these dates to avoid sending stuff in the middle of the night
      case ReleaseType.GIVEN_DATE => Some(adjustReleaseDate(new DateTime(config.getReleaseDate)))
      case ReleaseType.GIVEN_AMOUNT_DAYS =>
        Some(adjustReleaseDate(new DateTime(exam.getGradedTime).plusDays(config.getAmountDays)))
      case ReleaseType.AFTER_EXAM_PERIOD => Some(adjustReleaseDate(new DateTime(exam.getPeriodEnd).plusDays(1)))
      // Not handled at least by this actor
      case _ => None
    releaseDate.exists(_.isBeforeNow)

  private def notifyStudent(exam: Exam): Unit =
    val student = exam.getCreator
    // Update database synchronously
    exam.setAutoEvaluationNotified(DateTime.now)
    exam.update()
    // Schedule email sending asynchronously
    actorSystem.scheduler.scheduleOnce(
      1.second,
      () =>
        catching(classOf[RuntimeException]).either(
          composer.composeInspectionReady(student, null, exam)
        ) match
          case Left(e) => logger.error(s"Sending mail to ${student.getEmail} failed", e)
          case Right(_) => logger.debug(s"Mail sent to ${student.getEmail}")
    )
