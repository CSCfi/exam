// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.section

import com.fasterxml.jackson.databind.JsonNode
import play.mvc.Http
import validation.core.{Attrs, SanitizingHelper, ValidatorAction}

/** DTO for section question data with sanitized HTML fields.
  *
  * All fields are optional and represent sanitized HTML content.
  */
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
    def parseFromJson(body: JsonNode): SectionQuestionDTO =
      val answerInstructions = Option(SanitizingHelper.parseHtml("answerInstructions", body))
      val evaluationCriteria = Option(SanitizingHelper.parseHtml("evaluationCriteria", body))

      // Question text may be nested under a "question" field
      val questionText =
        if body.has("question") then Option(SanitizingHelper.parseHtml("question", body.get("question")))
        else None

      SectionQuestionDTO(answerInstructions, evaluationCriteria, questionText)

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    val dto = QuestionParser.parseFromJson(body)
    req.addAttr(Attrs.SECTION_QUESTION, dto)

