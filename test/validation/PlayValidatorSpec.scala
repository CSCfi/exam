// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation

import org.scalatest.EitherValues
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import play.api.libs.json.*
import validation.calendar.ReservationValidator
import validation.exam.ExamValidator

import java.time.Instant

// Parsers return a FieldError instead of throwing, so input that cannot be parsed reaches the
// caller as a Left. Callers that use a validator outside the request filter (e.g. collaborative
// exam updates) used to get the exception and answer 500 instead of 400.
class PlayValidatorSpec extends AnyWordSpec with Matchers with EitherValues:

  private val now = Instant.parse("2026-01-01T00:00:00Z")

  "ReservationValidator" should {

    val reservation = Json.obj(
      "roomId" -> 1,
      "examId" -> 2,
      "start"  -> "2026-01-02T10:00:00Z",
      "end"    -> "2026-01-02T12:00:00Z"
    )

    "parse a complete reservation" in {
      val dto = ReservationValidator.forCreation(reservation, now).value
      dto.roomId mustBe 1L
      dto.examId mustBe 2L
    }

    "return the missing field as a Left" in {
      val error = ReservationValidator.forCreation(reservation - "roomId", now).left.value
      error.validationResult.errors.map(_.field) mustBe List("roomId")
    }

    "return an unparseable date as a Left" in {
      val body  = reservation + ("start" -> JsString("not a date"))
      val error = ReservationValidator.forCreation(body, now).left.value
      error.validationResult.errors.map(_.field) mustBe List("start")
    }
  }

  "ExamValidator" should {

    val exam = Json.obj("name" -> "Exam", "duration" -> 60)

    def withEvaluations(evaluations: JsObject*) = exam + ("evaluationConfig" -> Json.obj(
      "releaseType"      -> "IMMEDIATE",
      "gradeEvaluations" -> JsArray(evaluations)
    ))

    "parse an auto-evaluation config" in {
      val body = withEvaluations(
        Json.obj("grade" -> Json.obj("id" -> 1), "percentage" -> 50),
        Json.obj("grade" -> Json.obj("id" -> 2), "percentage" -> 80)
      )
      val config = ExamValidator.forUpdate(body).value.autoEvaluationConfig
      config.gradeEvaluations.size mustBe 2
    }

    "return an unknown feedback release type as a Left" in {
      val body  = exam + ("feedbackConfig" -> Json.obj("releaseType" -> "WHENEVER"))
      val error = ExamValidator.forUpdate(body).left.value
      error.validationResult.errors.map(_.field) mustBe List("feedbackConfig.releaseType")
    }

    "return a grade evaluation without a percentage as a Left" in {
      val body  = withEvaluations(Json.obj("grade" -> Json.obj("id" -> 1)))
      val error = ExamValidator.forUpdate(body).left.value
      error.validationResult.errors.map(_.field) mustBe List("gradeEvaluations.percentage")
    }

    "keep a JSON null config as a request to clear it" in {
      val body = exam + ("evaluationConfig" -> JsNull)
      ExamValidator.forUpdate(body).value.autoEvaluationConfig mustBe null
    }

    def millis(iso: String) = Instant.parse(iso).toEpochMilli

    "accept a period ending in year 9999" in {
      val body = exam ++ Json.obj(
        "periodStart" -> millis("2026-02-08T22:00:00Z"),
        "periodEnd"   -> millis("9999-12-31T23:59:59.999Z")
      )
      ExamValidator.forUpdate(body).value.periodEnd.toString mustBe "9999-12-31T23:59:59.999Z"
    }

    // Instants past 9999 serialize as "+10000-..." which the UI's DatePipe cannot parse
    "return period dates past year 9999 as a Left" in {
      val body = exam ++ Json.obj(
        "periodStart" -> millis("+10000-02-08T22:00:00Z"),
        "periodEnd"   -> millis("+10000-02-19T21:59:59.999Z")
      )
      val error = ExamValidator.forUpdate(body).left.value
      error.validationResult.errors.map(_.field) mustBe List("periodStart", "periodEnd")
    }
  }
