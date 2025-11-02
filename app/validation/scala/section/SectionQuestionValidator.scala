// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.section

import com.fasterxml.jackson.databind.JsonNode
import play.api.libs.json.*
import play.mvc.Http
import validation.scala.core.*
import validation.java.core.{Attrs, ValidatorAction}

case class SectionQuestionDTO(
    answerInstructions: Option[String],
    evaluationCriteria: Option[String],
    questionText: Option[String]
):
  // Java interop - return null if not present (matches controller expectation)
  def getAnswerInstructionsOrNull: String = answerInstructions.orNull
  def getEvaluationCriteriaOrNull: String = evaluationCriteria.orNull
  def getQuestionTextOrNull: String       = questionText.orNull

class SectionQuestionValidator extends ValidatorAction:

  private object QuestionParser:
    def parseFromJson(body: JsValue): SectionQuestionDTO =
      val answerInstructions = PlayJsonHelper.parseHtml("answerInstructions", body)
      val evaluationCriteria = PlayJsonHelper.parseHtml("evaluationCriteria", body)

      // Question text may be nested under a "question" field
      val questionText =
        (body \ "question").asOpt[JsValue].flatMap { questionNode =>
          PlayJsonHelper.parseHtml("question", questionNode)
        }

      SectionQuestionDTO(answerInstructions, evaluationCriteria, questionText)

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    val jsValue = Json.parse(body.toString)
    val dto = QuestionParser.parseFromJson(jsValue)
    req.addAttr(Attrs.SECTION_QUESTION, dto)

