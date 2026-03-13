// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.exam

import database.EbeanQueryExtensions
import models.assessment.AutoEvaluationReleaseType
import models.exam.ExamState
import models.exam.{Exam, GradeScale}
import org.joda.time.DateTime
import play.api.Logging
import services.mail.EmailComposer

import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

class AutoEvaluationHandlerImpl @Inject (
    private val composer: EmailComposer
) extends AutoEvaluationHandler
    with EbeanQueryExtensions
    with Logging:

  override def autoEvaluate(exam: Exam): Unit =
    val config = exam.autoEvaluationConfig
    if Option(config).nonEmpty then
      // Grade automatically
      process(exam)
      if config.releaseType == AutoEvaluationReleaseType.IMMEDIATE then
        // Notify student immediately
        exam.autoEvaluationNotified = DateTime.now
        exam.update()
        val student = exam.creator
        composer.scheduleEmail(5.seconds) { composer.composeInspectionReady(student, None, exam) }
        logger.debug(s"Scheduled email about automatic evaluation to ${student.email}")

  private def process(exam: Exam): Unit =
    getGradeBasedOnScore(exam) match
      case Left(msg) =>
        logger.error(msg)
        throw new RuntimeException()
      case Right((grade, msg)) =>
        // NOTE: do not set graded by person here, one who makes a record will get the honor
        exam.grade = grade
        exam.gradedTime = DateTime.now
        exam.creditType = exam.examType
        exam.examLanguages.asScala.headOption match
          case Some(lang) =>
            exam.answerLanguage = lang.code
            exam.state = ExamState.GRADED
            exam.update()
            logger.info(msg)
          case _ => throw new RuntimeException("No exam language found!")

  private def getGradeBasedOnScore(exam: Exam) =
    val (score, maxScore) = (exam.getTotalScore, exam.getMaxScore)
    val percentage        = if maxScore == 0 then 0 else score * 100 / maxScore
    val evaluations =
      exam.autoEvaluationConfig.gradeEvaluations.asScala.toList.sortBy(_.percentage)
    evaluations.findLast(_.percentage <= percentage) match
      case None => Left("Could not determine a grade")
      case Some(ge) =>
        resolveScale(exam) match
          case Some(s) if s.grades.contains(ge.grade) =>
            val grade = ge.grade
            val msg =
              s"Automatically grading exam #${exam.id}, $score/$maxScore points ($percentage%) " +
                s"graded as ${grade.name} using percentage threshold ${ge.percentage}"
            Right((grade, msg))
          case _ => Left("Grade in auto evaluation configuration not found in exam grade scale!")

  private def resolveScale(exam: Exam): Option[GradeScale] = Option(exam.gradeScale) match
    case scale @ Some(_) => scale
    case _ =>
      Option(exam.course).flatMap(c => Option(c.gradeScale)) match
        case scale @ Some(_) => scale
        case _ => Option(exam.parent).flatMap(p => Option(p.course)).flatMap(c =>
            Option(c.gradeScale)
          )
