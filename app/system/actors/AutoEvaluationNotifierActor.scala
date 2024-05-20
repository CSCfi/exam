/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package system.actors

import impl.EmailComposer
import io.ebean.DB
import models.AutoEvaluationConfig.ReleaseType
import models.Exam
import org.apache.pekko.actor.AbstractActor
import org.joda.time.DateTime
import play.api.Logging
import util.datetime.DateTimeHandler
import util.scala.DbApiHelper

import javax.inject.Inject
import scala.util.control.Exception.catching

class AutoEvaluationNotifierActor @Inject (
    private val composer: EmailComposer,
    private val dateTimeHandler: DateTimeHandler
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
    catching(classOf[RuntimeException]).either(
      composer.composeInspectionReady(student, null, exam)
    ) match
      case Left(e) => logger.error(s"Sending mail to ${student.getEmail} failed", e)
      case Right(_) =>
        logger.debug(s"Mail sent to ${student.getEmail}")
        exam.setAutoEvaluationNotified(DateTime.now)
        exam.update()
