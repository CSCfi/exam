// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import com.fasterxml.jackson.databind.JsonNode
import database.EbeanJsonExtensions
import features.iop.collaboration.services.CollaborativeExamProcessingService
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import play.api.libs.json.*

class CollaborativeClozeTestAnswerSpec extends AnyWordSpec with Matchers:

  private val BlankAnswerText = "no answer"

  // Two blanks: "cat" (correct) and "dog" (left empty by the student)
  private val QuestionText =
    """<p>A <span cloze="true" id="1">cat</span> and a <span cloze="true" id="2">dog</span></p>"""

  private def examNode(clozeTestAnswer: JsValue): JsonNode =
    EbeanJsonExtensions.toJacksonJson(
      Json.obj(
        "examSections" -> Json.arr(
          Json.obj(
            "sectionQuestions" -> Json.arr(
              Json.obj(
                "id"       -> 1,
                "question" -> Json.obj("type" -> "ClozeTestQuestion", "question" -> QuestionText),
                "clozeTestAnswer" -> clozeTestAnswer
              ),
              Json.obj(
                "id"       -> 2,
                "question" -> Json.obj("type" -> "EssayQuestion", "question" -> "<p>Essay</p>"),
                "clozeTestAnswer" -> JsNull
              )
            )
          )
        )
      )
    )

  private def resolve(clozeTestAnswer: JsValue): JsObject =
    val node = examNode(clozeTestAnswer)
    CollaborativeExamProcessingService.resolveClozeTestAnswers(node, BlankAnswerText)
    EbeanJsonExtensions.toPlayJson(node).as[JsObject]

  private def firstAnswer(exam: JsObject): JsObject =
    (exam \ "examSections" \ 0 \ "sectionQuestions" \ 0 \ "clozeTestAnswer").as[JsObject]

  "CollaborativeExamProcessingService.resolveClozeTestAnswers" when:
    "the payload carries an answer" should:
      val answer = Json.obj("id" -> 10, "answer" -> """{"1":"cat","2":""}""")

      "write the rendered question back into the JSON" in:
        val question = (firstAnswer(resolve(answer)) \ "question").as[String]
        question must include("cat")
        question must include("cloze-correct")
        question must include(BlankAnswerText)
        question must include("cloze-incorrect")

      "write the score back into the JSON" in:
        val score = (firstAnswer(resolve(answer)) \ "score").as[JsObject]
        (score \ "correctAnswers").as[Int] mustBe 1
        (score \ "incorrectAnswers").as[Int] mustBe 1

      "retain the raw answer" in:
        (firstAnswer(resolve(answer)) \ "answer").as[String] mustBe """{"1":"cat","2":""}"""

    "the question was left unanswered" should:
      "still produce a question and a score" in:
        val resolved = firstAnswer(resolve(JsNull))
        (resolved \ "question").as[String] must include(BlankAnswerText)
        (resolved \ "score" \ "correctAnswers").as[Int] mustBe 0
        (resolved \ "score" \ "incorrectAnswers").as[Int] mustBe 2

    "the section holds other question types" should:
      "leave them untouched" in:
        val esq = (resolve(JsNull) \ "examSections" \ 0 \ "sectionQuestions" \ 1).as[JsObject]
        (esq \ "clozeTestAnswer").get mustBe JsNull
