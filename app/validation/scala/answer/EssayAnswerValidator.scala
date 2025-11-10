// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.answer

import org.jsoup.Jsoup
import play.api.libs.json.*
import play.api.libs.typedmap.TypedKey
import play.api.mvc.{Request, Result, Results, AnyContent}
import validation.scala.core.*

case class EssayAnswerDTO(answer: String, objectVersion: Option[Long]):
  def getObjectVersionAsJava: java.util.Optional[java.lang.Long] =
    objectVersion match
      case Some(version) => java.util.Optional.of(java.lang.Long.valueOf(version))
      case None          => java.util.Optional.empty()

object EssayAnswerValidator extends PlayJsonValidator:

  val ESSAY_ANSWER_KEY: TypedKey[EssayAnswerDTO] = TypedKey[EssayAnswerDTO]("essayAnswer")

  private object AnswerValidator:
    def get(body: JsValue): Either[ValidationException, EssayAnswerDTO] =
      PlayValidator(EssayAnswerParser.parseFromJson).validate(body)

  private object EssayAnswerParser:
    def parseFromJson(body: JsValue): EssayAnswerDTO =
      // Parse and sanitize HTML answer
      val answer = (body \ "answer").asOpt[String] match
        case Some(html) if html.nonEmpty => Jsoup.clean(html, HTML_SAFELIST)
        case _                            => ""
      val objectVersion = PlayJsonHelper.parse[Long]("objectVersion", body)
      EssayAnswerDTO(answer, objectVersion)

  override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
    AnswerValidator.get(json) match
      case Right(answer) => Right(request.addAttr(ESSAY_ANSWER_KEY, answer))
      case Left(ex)      => Left(Results.BadRequest(ex.getMessage))
