// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.question

import org.jsoup.Jsoup
import play.api.libs.json.JsValue
import play.api.libs.typedmap.TypedKey
import play.api.mvc.{AnyContent, Request, Result}
import validation.core.PlayJsonValidator

object QuestionTextValidator extends PlayJsonValidator:

  // Create Scala TypedKey with same key name as Java version
  val QUESTION_TEXT_KEY: TypedKey[String] = TypedKey[String]("question")

  override def sanitize(
      request: Request[AnyContent],
      json: JsValue
  ): Either[Result, Request[AnyContent]] =
    val questionText = (json \ "question").asOpt[String]
    val sanitized    = questionText.map(text => Jsoup.clean(text, HTML_SAFELIST)).orNull
    Right(request.addAttr(QUESTION_TEXT_KEY, sanitized))
