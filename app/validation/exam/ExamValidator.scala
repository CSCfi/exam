// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.exam

import cats.data.ValidatedNel
import cats.implicits.*
import com.fasterxml.jackson.databind.JsonNode
import models.exam.Exam
import validation.SanitizingException
import validation.core.{FieldError, SanitizingHelper, ValidationException, Validator}
import validation.core.Validator.given

import java.util
import java.util.Date
import scala.jdk.CollectionConverters.*

/** Exam-specific validator using the generic Validator framework. Provides different validation profiles (forUpdate,
  * forCreation) with different strictness levels.
  */
object ExamValidator:

  def forUpdate(body: JsonNode): Either[ValidationException, Exam] =
    Validator(ExamParser.parseFromJson)
      .withRule(requireName)
      .withRule(requireDuration)
      .withRule(requirePublishedExamHasName)
      .validate(body)

  def forCreation(body: JsonNode): Either[ValidationException, Exam] =
    Validator(ExamParser.parseFromJson)
      .withRule(requireImplementation)
      .withRule(requireExecutionType)
      .validate(body)

  // ========== Validation Rules ==========

  private def requireName(exam: Exam): ValidatedNel[FieldError, String] =
    Validator.requireField("name", exam.getName)

  private def requireDuration(exam: Exam): ValidatedNel[FieldError, Integer] =
    Validator.requirePositive("duration", exam.getDuration)

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
        if hasUnnamedSection then Validator.invalid[Unit]("sections", "All exam sections must be named")
        else Validator.valid(())
      }
      .getOrElse(Validator.valid(()))

  private def requireNonEmptyLanguages(exam: Exam): ValidatedNel[FieldError, Unit] =
    Option(exam.getExamLanguages.asScala)
      .filter(_.nonEmpty)
      .map(_ => ())
      .toValidNel(FieldError("languages", "Exam must have at least one language"))

  private def requireImplementation(exam: Exam): ValidatedNel[FieldError, Exam.Implementation] =
    Validator.requirePresent("implementation", exam.getImplementation)

  private def requireExecutionType(exam: Exam): ValidatedNel[FieldError, models.exam.ExamExecutionType] =
    Validator.requirePresent("executionType", exam.getExecutionType)

  private def requirePublishedExamHasName(exam: Exam): ValidatedNel[FieldError, Unit] =
    val isPublished = exam.getState == Exam.State.PUBLISHED
    val hasNoName   = Option(exam.getName).forall(_.trim.isEmpty)
    Validator.when(isPublished && hasNoName):
      Validator.invalid("name", "Published exam must have a name")

/** Parser for converting JSON to Exam objects. Uses the existing SanitizingHelper for consistency.
  */
private object ExamParser:

  def parseFromJson(body: JsonNode): Exam =
    val exam = new Exam()

    // Parse basic fields using Scala SanitizingHelper
    SanitizingHelper.parse[String]("name", body).foreach(exam.setName)

    SanitizingHelper.parseEnum("state", body, classOf[Exam.State]).foreach(exam.setState)

    SanitizingHelper
      .parse[java.lang.Long]("periodStart", body)
      .map(org.joda.time.DateTime(_))
      .foreach(exam.setPeriodStart)

    SanitizingHelper
      .parse[java.lang.Long]("periodEnd", body)
      .map(org.joda.time.DateTime(_))
      .foreach(exam.setPeriodEnd)

    SanitizingHelper.parse[Integer]("duration", body).foreach(exam.setDuration)

    SanitizingHelper
      .parseEnum("implementation", body, classOf[Exam.Implementation])
      .foreach(exam.setImplementation)

    SanitizingHelper.parse[java.lang.Boolean]("shared", body).foreach(v => exam.setShared(v))

    SanitizingHelper
      .parse[String]("answerLanguage", body)
      .foreach(exam.setAnswerLanguage)

    exam.setInstruction(SanitizingHelper.parseHtml("instruction", body))
    exam.setEnrollInstruction(SanitizingHelper.parseHtml("enrollInstruction", body))

    SanitizingHelper
      .parse[Integer]("trialCount", body)
      .foreach(exam.setTrialCount)

    SanitizingHelper
      .parse[java.lang.Boolean]("subjectToLanguageInspection", body)
      .foreach(exam.setSubjectToLanguageInspection)

    SanitizingHelper.parse[String]("internalRef", body).foreach(exam.setInternalRef)

    SanitizingHelper.parse[java.lang.Boolean]("anonymous", body).foreach(v => exam.setAnonymous(v))

    SanitizingHelper
      .parse[String]("organisations", body)
      .foreach(exam.setOrganisations)

    // Handle grading (ID reference)
    SanitizingHelper.parse[Integer]("grading", body).foreach { gradeId =>
      val grade = new models.exam.Grade()
      grade.setId(gradeId)
      exam.setGrade(grade)
    }

    // Handle exam type
    Option(body.get("examType"))
      .flatMap(node => SanitizingHelper.parse[String]("type", node))
      .foreach { typeStr =>
        val examType = new models.exam.ExamType(typeStr)
        exam.setExamType(examType)
      }

    // Handle execution type
    Option(body.get("executionType"))
      .flatMap(node => SanitizingHelper.parse[String]("type", node))
      .foreach { typeStr =>
        val executionType = new models.exam.ExamExecutionType()
        executionType.setType(typeStr)
        exam.setExecutionType(executionType)
      }

    // Handle feedback config
    Option(body.get("feedbackConfig")).foreach { node =>
      if node.isNull then exam.setExamFeedbackConfig(null)
      else if node.isObject then
        val config = new models.assessment.ExamFeedbackConfig()
        config.setReleaseType(
          SanitizingHelper
            .parseEnum("releaseType", node, classOf[models.assessment.ExamFeedbackConfig.ReleaseType])
            .getOrElse(throw new SanitizingException("bad releaseType"))
        )
        SanitizingHelper
          .parse[java.lang.Long]("releaseDate", node)
          .foreach(rd => config.setReleaseDate(new org.joda.time.DateTime(rd)))
        exam.setExamFeedbackConfig(config)
    }

    // Handle auto-evaluation config
    Option(body.get("evaluationConfig")).foreach { node =>
      if node.isNull then exam.setAutoEvaluationConfig(null)
      else if node.isObject then
        val config = new models.assessment.AutoEvaluationConfig()
        config.setReleaseType(
          SanitizingHelper
            .parseEnum("releaseType", node, classOf[models.assessment.AutoEvaluationConfig.ReleaseType])
            .getOrElse(throw new SanitizingException("bad releaseType"))
        )
        config.setAmountDays(
          SanitizingHelper.parse[Integer]("amountDays", node).orNull
        )
        SanitizingHelper
          .parse[java.lang.Long]("releaseDate", node)
          .foreach(rd => config.setReleaseDate(new Date(rd)))
        config.setGradeEvaluations(new util.HashSet())

        Option(node.get("gradeEvaluations")).foreach { gradeEvaluations =>
          gradeEvaluations.forEach { evaluation =>
            val ge = new models.assessment.GradeEvaluation()

            val gradeNode = Option(evaluation.get("grade"))
              .filter(_.has("id"))
              .getOrElse(throw new SanitizingException("invalid grade"))

            val grade = new models.exam.Grade()
            grade.setId(
              SanitizingHelper
                .parse[Integer]("id", gradeNode)
                .getOrElse(throw new SanitizingException("invalid grade"))
            )
            ge.setGrade(grade)
            ge.setPercentage(
              SanitizingHelper
                .parse[Integer]("percentage", evaluation)
                .getOrElse(throw new SanitizingException("no percentage"))
            )
            config.getGradeEvaluations.add(ge)
          }
        }

        exam.setAutoEvaluationConfig(config)
    }

    exam
