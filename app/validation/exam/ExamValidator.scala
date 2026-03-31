// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.exam

import cats.data.ValidatedNel
import cats.implicits.*
import models.exam.Exam
import models.exam.ExamState
import play.api.libs.json.*
import validation.core.*

import java.time.Instant
import java.util
import java.util.Date
import scala.jdk.CollectionConverters.*

/** Exam-specific validator using the generic Validator framework. Provides different validation
  * profiles (forUpdate, forCreation) with different strictness levels.
  */
object ExamValidator:

  def forUpdate(body: JsValue): Either[ValidationException, Exam] =
    PlayValidator(ExamParser.parseFromJson)
      .withRule(requireName)
      .withRule(requireDuration)
      .withRule(requirePublishedExamHasName)
      .validate(body)

  def forCreation(body: JsValue): Either[ValidationException, Exam] =
    PlayValidator(ExamParser.parseFromJson)
      .withRule(requireImplementation)
      .withRule(requireExecutionType)
      .validate(body)

  // ========== Validation Rules ==========

  private def requireName(exam: Exam): ValidatedNel[FieldError, String] =
    PlayValidator.requireField("name", exam.name)

  private def requireDuration(exam: Exam): ValidatedNel[FieldError, Integer] =
    val duration = Option(exam.duration).map(_.intValue()).getOrElse(0)
    PlayValidator.requirePositive("duration", duration).map(_ => exam.duration)

  private def requireNonEmptySections(exam: Exam): ValidatedNel[FieldError, Unit] =
    Option(exam.examSections.asScala)
      .filter(_.nonEmpty)
      .map(_ => ())
      .toValidNel(FieldError("sections", "Exam must have at least one section"))

  private def requireAllSectionsNamed(exam: Exam): ValidatedNel[FieldError, Unit] =
    Option(exam.examSections.asScala)
      .filter(_.nonEmpty)
      .map { sections =>
        val hasUnnamedSection = sections.exists(s => Option(s.name).forall(_.trim.isEmpty))
        if hasUnnamedSection then
          PlayValidator.invalid[Unit]("sections", "All exam sections must be named")
        else PlayValidator.valid(())
      }
      .getOrElse(PlayValidator.valid(()))

  private def requireNonEmptyLanguages(exam: Exam): ValidatedNel[FieldError, Unit] =
    Option(exam.examLanguages.asScala)
      .filter(_.nonEmpty)
      .map(_ => ())
      .toValidNel(FieldError("languages", "Exam must have at least one language"))

  private def requireImplementation(exam: Exam): ValidatedNel[FieldError, Exam.Implementation] =
    PlayValidator.requirePresent("implementation", exam.implementation)

  private def requireExecutionType(exam: Exam)
      : ValidatedNel[FieldError, models.exam.ExamExecutionType] =
    PlayValidator.requirePresent("executionType", exam.executionType)

  private def requirePublishedExamHasName(exam: Exam): ValidatedNel[FieldError, Unit] =
    val isPublished = exam.state == ExamState.PUBLISHED
    val hasNoName   = Option(exam.name).forall(_.trim.isEmpty)
    PlayValidator.when(isPublished && hasNoName):
      PlayValidator.invalid("name", "Published exam must have a name")

/** Parser for converting JSON to Exam objects using Play JSON.
  */
private object ExamParser:

  def parseFromJson(body: JsValue): Exam =
    val exam = new Exam()

    // Parse basic fields using Play JSON
    PlayJsonHelper.parse[String]("name", body).foreach(v => exam.name = v)

    PlayJsonHelper.parseEnum("state", body, classOf[Exam.State]).foreach(v => exam.state = v)

    PlayJsonHelper
      .parse[Long]("periodStart", body)
      .map(Instant.ofEpochMilli)
      .foreach(v => exam.periodStart = v)

    PlayJsonHelper
      .parse[Long]("periodEnd", body)
      .map(Instant.ofEpochMilli)
      .foreach(v => exam.periodEnd = v)

    PlayJsonHelper.parse[Int]("duration", body).foreach(v => exam.duration = v)

    PlayJsonHelper
      .parseEnum("implementation", body, classOf[Exam.Implementation])
      .foreach(v => exam.implementation = v)

    PlayJsonHelper.parse[Boolean]("shared", body).foreach(v => exam.shared = v)

    PlayJsonHelper
      .parse[String]("answerLanguage", body)
      .foreach(v => exam.answerLanguage = v)

    exam.instruction = PlayJsonHelper.parseHtml("instruction", body).orNull
    exam.enrollInstruction = PlayJsonHelper.parseHtml("enrollInstruction", body).orNull

    PlayJsonHelper
      .parse[Int]("trialCount", body)
      .foreach(v => exam.trialCount = v)

    PlayJsonHelper
      .parse[Boolean]("subjectToLanguageInspection", body)
      .foreach(v => exam.subjectToLanguageInspection = v)

    PlayJsonHelper.parse[String]("internalRef", body).foreach(v => exam.internalRef = v)

    PlayJsonHelper.parse[Boolean]("anonymous", body).foreach(v => exam.anonymous = v)

    PlayJsonHelper
      .parse[String]("organisations", body)
      .foreach(v => exam.organisations = v)

    // Handle grading (ID reference)
    PlayJsonHelper.parse[Int]("grading", body).foreach { gradeId =>
      val grade = new models.exam.Grade()
      grade.id = gradeId
      exam.grade = grade
    }

    // Handle exam type
    (body \ "examType")
      .asOpt[JsObject]
      .flatMap(node => PlayJsonHelper.parse[String]("type", node))
      .foreach { typeStr =>
        val examType = new models.exam.ExamType()
        examType.`type` = typeStr
        exam.examType = examType
      }

    // Handle execution type
    (body \ "executionType")
      .asOpt[JsObject]
      .flatMap(node => PlayJsonHelper.parse[String]("type", node))
      .foreach { typeStr =>
        val executionType = new models.exam.ExamExecutionType()
        executionType.`type` = typeStr
        exam.executionType = executionType
      }

    // Handle feedback config
    (body \ "feedbackConfig").asOpt[JsValue] match
      case Some(JsNull) =>
        exam.examFeedbackConfig = null
      case Some(obj: JsObject) =>
        val config = new models.assessment.ExamFeedbackConfig()
        config.releaseType =
          PlayJsonHelper
            .parseEnum(
              "releaseType",
              obj,
              classOf[models.assessment.ExamFeedbackConfig.ReleaseType]
            )
            .getOrElse(throw SanitizingException("bad releaseType"))

        PlayJsonHelper
          .parse[Long]("releaseDate", obj)
          .foreach(rd => config.releaseDate = Instant.ofEpochMilli(rd))
        exam.examFeedbackConfig = config
      case _ => // None or other JsValue types
    // Handle auto-evaluation config
    (body \ "evaluationConfig").asOpt[JsValue] match
      case Some(JsNull) =>
        exam.autoEvaluationConfig = null
      case Some(obj: JsObject) =>
        val config = new models.assessment.AutoEvaluationConfig()
        config.releaseType =
          PlayJsonHelper
            .parseEnum(
              "releaseType",
              obj,
              classOf[models.assessment.AutoEvaluationConfig.ReleaseType]
            )
            .getOrElse(throw SanitizingException("bad releaseType"))

        config.amountDays =
          PlayJsonHelper.parse[Int]("amountDays", obj).map(Integer.valueOf).orNull

        PlayJsonHelper
          .parse[Long]("releaseDate", obj)
          .foreach(rd => config.releaseDate = new Date(rd))
        config.gradeEvaluations = new util.HashSet()

        (obj \ "gradeEvaluations").asOpt[List[JsValue]].foreach { gradeEvaluations =>
          gradeEvaluations.foreach { evaluation =>
            val ge = new models.assessment.GradeEvaluation()

            val gradeObj = (evaluation \ "grade")
              .asOpt[JsObject]
              .filter(g => (g \ "id").isDefined)
              .getOrElse(throw SanitizingException("invalid grade"))

            val grade = new models.exam.Grade()
            grade.id =
              PlayJsonHelper
                .parse[Int]("id", gradeObj)
                .getOrElse(throw SanitizingException("invalid grade"))

            ge.grade = grade
            ge.percentage =
              PlayJsonHelper
                .parse[Int]("percentage", evaluation)
                .getOrElse(throw SanitizingException("no percentage"))

            config.gradeEvaluations.add(ge)
          }
        }

        exam.autoEvaluationConfig = config
      case _ => // None or other JsValue types
    exam
