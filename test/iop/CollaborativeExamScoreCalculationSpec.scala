// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import database.EbeanJsonExtensions
import features.iop.collaboration.services.CollaborativeExamProcessingService
import models.exam.Exam
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import play.api.libs.json.*
import services.json.JsonDeserializer

// Coverage for the score aggregates the collaborative review *list* endpoint
// (GET /app/iop/reviews/:id) is supposed to compute. The listing templates read
// exam.totalScore / maxScore / approvedAnswerCount / rejectedAnswerCount straight
// off the payload, and review-list.service.ts sends exam.totalScore back when
// recording a collaborative review.
class CollaborativeExamScoreCalculationSpec extends AnyWordSpec with Matchers:

  // One multiple-choice question worth 3 points, with the correct option answered.
  private def sectionJson(id: Long): JsObject = Json.obj(
    "id" -> id,
    "sectionQuestions" -> Json.arr(
      Json.obj(
        "id"       -> id,
        "maxScore" -> 3.0,
        "question" -> Json.obj("id" -> id, "type" -> "MultipleChoiceQuestion"),
        "options" -> Json.arr(
          Json.obj(
            "id"       -> id,
            "answered" -> true,
            "option"   -> Json.obj("id" -> id, "correctOption" -> true)
          )
        )
      )
    )
  )

  // Two sections, 3 points each: 6 awarded out of 6 available.
  private def examJson(aggregates: JsObject = Json.obj()): JsObject =
    Json.obj(
      "id"           -> 1,
      "state"        -> "REVIEW",
      "examSections" -> Json.arr(sectionJson(1L), sectionJson(2L))
    ) ++ aggregates

  private def participations(exam: JsObject): JsArray =
    Json.arr(Json.obj("_id" -> "abc", "_rev" -> "1-abc", "exam" -> exam))

  private def deserialize(exam: JsObject): Exam =
    JsonDeserializer.deserialize(classOf[Exam], EbeanJsonExtensions.toJacksonJson(exam))

  "The exam model behind calculateScores" should:
    "derive the aggregates correctly from the payload" in:
      val exam = deserialize(examJson())
      exam.setMaxScore()
      exam.setTotalScore()
      exam.setApprovedAnswerCount()
      exam.setRejectedAnswerCount()

      exam.totalScore must be(6.0)
      exam.maxScore must be(6.0)
      exam.approvedAnswerCount must be(0)
      exam.rejectedAnswerCount must be(0)

  "CollaborativeExamProcessingService.calculateScores" when:
    "the payload carries no aggregates" should:
      "add them to the exam" in:
        val scored = CollaborativeExamProcessingService.calculateScores(participations(examJson()))

        (scored \ 0 \ "exam" \ "totalScore").as[Double] must be(6.0)
        (scored \ 0 \ "exam" \ "maxScore").as[Double] must be(6.0)
        (scored \ 0 \ "exam" \ "approvedAnswerCount").as[Int] must be(0)
        (scored \ 0 \ "exam" \ "rejectedAnswerCount").as[Int] must be(0)

    "the payload carries stale aggregates" should:
      // The remote copy is only as fresh as the last time an Exam object was written
      // to it, so grading done since then is not reflected in the stored values.
      "overwrite them with values recomputed from the answers" in:
        val stale = Json.obj(
          "totalScore"          -> 999.0,
          "maxScore"            -> 999.0,
          "approvedAnswerCount" -> 7,
          "rejectedAnswerCount" -> 7
        )
        val scored =
          CollaborativeExamProcessingService.calculateScores(participations(examJson(stale)))

        (scored \ 0 \ "exam" \ "totalScore").as[Double] must be(6.0)
        (scored \ 0 \ "exam" \ "maxScore").as[Double] must be(6.0)
        (scored \ 0 \ "exam" \ "approvedAnswerCount").as[Int] must be(0)
        (scored \ 0 \ "exam" \ "rejectedAnswerCount").as[Int] must be(0)

    "the exam has been graded since the remote copy was written" should:
      "reflect the forced score rather than the stored total" in:
        // Teacher forced the first question down to 1 point: 1 + 3 = 4, not the stored 6.
        val forced = (examJson() \ "examSections" \ 0 \ "sectionQuestions" \ 0)
          .as[JsObject] + ("forcedScore" -> JsNumber(1.0))
        val exam = examJson(Json.obj("totalScore" -> 6.0)) ++ Json.obj(
          "examSections" -> Json.arr(
            Json.obj("id" -> 1, "sectionQuestions" -> Json.arr(forced)),
            sectionJson(2L)
          )
        )
        val scored = CollaborativeExamProcessingService.calculateScores(participations(exam))

        (scored \ 0 \ "exam" \ "totalScore").as[Double] must be(4.0)

    "an entry carries no exam" should:
      "pass it through untouched" in:
        val root   = Json.arr(Json.obj("_id" -> "abc"))
        val scored = CollaborativeExamProcessingService.calculateScores(root)

        scored must be(root)
