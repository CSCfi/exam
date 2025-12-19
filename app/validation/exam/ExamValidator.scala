// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.exam

import cats.data.ValidatedNel
import cats.implicits._
import models.exam.Exam
import play.api.libs.json._
import validation.core._

import java.util
import java.util.Date
import scala.jdk.CollectionConverters._

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
    PlayValidator.requireField("name", exam.getName)

  private def requireDuration(exam: Exam): ValidatedNel[FieldError, Integer] =
    val duration = Option(exam.getDuration).map(_.intValue()).getOrElse(0)
    PlayValidator.requirePositive("duration", duration).map(_ => exam.getDuration)

  private def requireNonEmptySections(exam: Exam): ValidatedNel[FieldError, Unit] =
    Option(exam.getExamSections.asScala)
      .filter(_.nonEmpty)
      .map(_ => ())
      .toValidNel(FieldError("sections", "Exam must have at least one section"))

  private def requireAllSectionsNamed(exam: Exam): ValidatedNel[FieldError, Unit] =
    Option(exam.getExamSections.asScala)
      .filter(_.nonEmpty)
      .map { sections =>
        val hasUnnamedSection = sections.exists(s => Option(s.getName).forall(_.trim.isEmpty))
        if hasUnnamedSection then
          PlayValidator.invalid[Unit]("sections", "All exam sections must be named")
        else PlayValidator.valid(())
      }
      .getOrElse(PlayValidator.valid(()))

  private def requireNonEmptyLanguages(exam: Exam): ValidatedNel[FieldError, Unit] =
    Option(exam.getExamLanguages.asScala)
      .filter(_.nonEmpty)
      .map(_ => ())
      .toValidNel(FieldError("languages", "Exam must have at least one language"))

  private def requireImplementation(exam: Exam): ValidatedNel[FieldError, Exam.Implementation] =
    PlayValidator.requirePresent("implementation", exam.getImplementation)

  private def requireExecutionType(exam: Exam)
      : ValidatedNel[FieldError, models.exam.ExamExecutionType] =
    PlayValidator.requirePresent("executionType", exam.getExecutionType)

  private def requirePublishedExamHasName(exam: Exam): ValidatedNel[FieldError, Unit] =
    val isPublished = exam.getState == Exam.State.PUBLISHED
    val hasNoName   = Option(exam.getName).forall(_.trim.isEmpty)
    PlayValidator.when(isPublished && hasNoName):
      PlayValidator.invalid("name", "Published exam must have a name")

/** Parser for converting JSON to Exam objects using Play JSON.
  */
private object ExamParser:

  def parseFromJson(body: JsValue): Exam =
    val exam = new Exam()

    // Parse basic fields using Play JSON
    PlayJsonHelper.parse[String]("name", body).foreach(exam.setName)

    PlayJsonHelper.parseEnum("state", body, classOf[Exam.State]).foreach(exam.setState)

    PlayJsonHelper
      .parse[Long]("periodStart", body)
      .map(org.joda.time.DateTime(_))
      .foreach(v => exam.setPeriodStart(v))

    PlayJsonHelper
      .parse[Long]("periodEnd", body)
      .map(org.joda.time.DateTime(_))
      .foreach(v => exam.setPeriodEnd(v))

    PlayJsonHelper.parse[Int]("duration", body).foreach(v => exam.setDuration(v))

    PlayJsonHelper
      .parseEnum("implementation", body, classOf[Exam.Implementation])
      .foreach(v => exam.setImplementation(v))

    PlayJsonHelper.parse[Boolean]("shared", body).foreach(v => exam.setShared(v))

    PlayJsonHelper
      .parse[String]("answerLanguage", body)
      .foreach(v => exam.setAnswerLanguage(v))

    exam.setInstruction(PlayJsonHelper.parseHtml("instruction", body).orNull)
    exam.setEnrollInstruction(PlayJsonHelper.parseHtml("enrollInstruction", body).orNull)

    PlayJsonHelper
      .parse[Int]("trialCount", body)
      .foreach(v => exam.setTrialCount(v))

    PlayJsonHelper
      .parse[Boolean]("subjectToLanguageInspection", body)
      .foreach(v => exam.setSubjectToLanguageInspection(v))

    PlayJsonHelper.parse[String]("internalRef", body).foreach(v => exam.setInternalRef(v))

    PlayJsonHelper.parse[Boolean]("anonymous", body).foreach(v => exam.setAnonymous(v))

    PlayJsonHelper
      .parse[String]("organisations", body)
      .foreach(v => exam.setOrganisations(v))

    // Handle grading (ID reference)
    PlayJsonHelper.parse[Int]("grading", body).foreach { gradeId =>
      val grade = new models.exam.Grade()
      grade.setId(gradeId)
      exam.setGrade(grade)
    }

    // Handle exam type
    (body \ "examType")
      .asOpt[JsObject]
      .flatMap(node => PlayJsonHelper.parse[String]("type", node))
      .foreach { typeStr =>
        val examType = new models.exam.ExamType(typeStr)
        exam.setExamType(examType)
      }

    // Handle execution type
    (body \ "executionType")
      .asOpt[JsObject]
      .flatMap(node => PlayJsonHelper.parse[String]("type", node))
      .foreach { typeStr =>
        val executionType = new models.exam.ExamExecutionType()
        executionType.setType(typeStr)
        exam.setExecutionType(executionType)
      }

    // Handle feedback config
    (body \ "feedbackConfig").asOpt[JsValue] match
      case Some(JsNull) =>
        exam.setExamFeedbackConfig(null)
      case Some(obj: JsObject) =>
        val config = new models.assessment.ExamFeedbackConfig()
        config.setReleaseType(
          PlayJsonHelper
            .parseEnum(
              "releaseType",
              obj,
              classOf[models.assessment.ExamFeedbackConfig.ReleaseType]
            )
            .getOrElse(throw SanitizingException("bad releaseType"))
        )
        PlayJsonHelper
          .parse[Long]("releaseDate", obj)
          .foreach(rd => config.setReleaseDate(new org.joda.time.DateTime(rd)))
        exam.setExamFeedbackConfig(config)
      case _ => // None or other JsValue types
    // Handle auto-evaluation config
    (body \ "evaluationConfig").asOpt[JsValue] match
      case Some(JsNull) =>
        exam.setAutoEvaluationConfig(null)
      case Some(obj: JsObject) =>
        val config = new models.assessment.AutoEvaluationConfig()
        config.setReleaseType(
          PlayJsonHelper
            .parseEnum(
              "releaseType",
              obj,
              classOf[models.assessment.AutoEvaluationConfig.ReleaseType]
            )
            .getOrElse(throw SanitizingException("bad releaseType"))
        )
        config.setAmountDays(
          PlayJsonHelper.parse[Int]("amountDays", obj).map(Integer.valueOf).orNull
        )
        PlayJsonHelper
          .parse[Long]("releaseDate", obj)
          .foreach(rd => config.setReleaseDate(new Date(rd)))
        config.setGradeEvaluations(new util.HashSet())

        (obj \ "gradeEvaluations").asOpt[List[JsValue]].foreach { gradeEvaluations =>
          gradeEvaluations.foreach { evaluation =>
            val ge = new models.assessment.GradeEvaluation()

            val gradeObj = (evaluation \ "grade")
              .asOpt[JsObject]
              .filter(g => (g \ "id").isDefined)
              .getOrElse(throw SanitizingException("invalid grade"))

            val grade = new models.exam.Grade()
            grade.setId(
              PlayJsonHelper
                .parse[Int]("id", gradeObj)
                .getOrElse(throw SanitizingException("invalid grade"))
            )
            ge.setGrade(grade)
            ge.setPercentage(
              PlayJsonHelper
                .parse[Int]("percentage", evaluation)
                .getOrElse(throw SanitizingException("no percentage"))
            )
            config.getGradeEvaluations.add(ge)
          }
        }

        exam.setAutoEvaluationConfig(config)
      case _ => // None or other JsValue types
    exam
