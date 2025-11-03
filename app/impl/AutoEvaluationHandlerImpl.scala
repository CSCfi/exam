// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl

import impl.mail.EmailComposer
import miscellaneous.scala.DbApiHelper
import models.assessment.AutoEvaluationConfig
import models.exam.{Exam, GradeScale}
import org.apache.pekko.actor.ActorSystem
import org.joda.time.DateTime
import play.api.Logging

import java.util.concurrent.TimeUnit
import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.concurrent.duration.{Duration, DurationInt}
import scala.jdk.CollectionConverters.*

class AutoEvaluationHandlerImpl @Inject (
    private val composer: EmailComposer,
    private val actor: ActorSystem,
    implicit val executionContext: ExecutionContext
) extends AutoEvaluationHandler
    with DbApiHelper
    with Logging:

  override def autoEvaluate(exam: Exam): Unit =
    val config = exam.getAutoEvaluationConfig
    if Option(config).nonEmpty then
      // Grade automatically
      process(exam)
      if config.getReleaseType == AutoEvaluationConfig.ReleaseType.IMMEDIATE then
        // Notify student immediately
        exam.setAutoEvaluationNotified(DateTime.now)
        exam.update()
        val student = exam.getCreator
        actor.scheduler.scheduleOnce(5.seconds, () => composer.composeInspectionReady(student, null, exam))
        logger.debug(s"Mail sent about automatic evaluation to ${student.getEmail}")

  private def process(exam: Exam): Unit =
    getGradeBasedOnScore(exam) match
      case Left(msg) =>
        logger.error(msg)
        throw new RuntimeException()
      case Right((grade, msg)) =>
        // NOTE: do not set graded by person here, one who makes a record will get the honor
        exam.setGrade(grade)
        exam.setGradedTime(DateTime.now)
        exam.setCreditType(exam.getExamType)
        exam.getExamLanguages.asScala.headOption match
          case Some(lang) =>
            exam.setAnswerLanguage(lang.getCode)
            exam.setState(Exam.State.GRADED)
            exam.update()
            logger.info(msg)
          case _ => throw new RuntimeException("No exam language found!")

  private def getGradeBasedOnScore(exam: Exam) =
    val (score, maxScore) = (exam.getTotalScore, exam.getMaxScore)
    val percentage        = if maxScore == 0 then 0 else score * 100 / maxScore
    val evaluations       = exam.getAutoEvaluationConfig.getGradeEvaluations.asScala.toList.sortBy(_.getPercentage)
    evaluations.findLast(_.getPercentage <= percentage) match
      case None => Left("Could not determine a grade")
      case Some(ge) =>
        resolveScale(exam) match
          case Some(s) if s.getGrades.contains(ge.getGrade) =>
            val grade = ge.getGrade
            val msg =
              s"Automatically grading exam #${exam.getId}, $score/$maxScore points ($percentage%) " +
                s"graded as ${grade.getName} using percentage threshold ${ge.getPercentage}"
            Right((grade, msg))
          case _ => Left("Grade in auto evaluation configuration not found in exam grade scale!")

  private def resolveScale(exam: Exam): Option[GradeScale] = Option(exam.getGradeScale) match
    case scale @ Some(_) => scale
    case _ =>
      Option(exam.getCourse).map(_.getGradeScale).nonNull match
        case scale @ Some(_) => scale
        case _               => Option(exam.getParent).map(_.getCourse).nonNull.map(_.getGradeScale).nonNull
