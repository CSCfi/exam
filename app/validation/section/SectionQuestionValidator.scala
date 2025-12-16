// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.section

import play.api.libs.json._
import play.api.mvc.{AnyContent, Request, Result}
import validation.core._

case class SectionQuestionDTO(
    answerInstructions: Option[String],
    evaluationCriteria: Option[String],
    questionText: Option[String]
):
  // Java interop - return null if not present (matches controller expectation)
  def getAnswerInstructionsOrNull: String = answerInstructions.orNull
  def getEvaluationCriteriaOrNull: String = evaluationCriteria.orNull
  def getQuestionTextOrNull: String       = questionText.orNull

object SectionQuestionValidator extends PlayJsonValidator:

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

  override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
    val dto = QuestionParser.parseFromJson(json)
    Right(request.addAttr(ScalaAttrs.SECTION_QUESTION, dto))
