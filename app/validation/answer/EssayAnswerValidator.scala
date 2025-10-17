// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.answer

import com.fasterxml.jackson.databind.JsonNode
import play.mvc.Http
import validation.core.*

case class EssayAnswerDTO(answer: String, objectVersion: Option[Long]):
  def getObjectVersionAsJava: java.util.Optional[java.lang.Long] =
    objectVersion match
      case Some(version) => java.util.Optional.of(java.lang.Long.valueOf(version))
      case None          => java.util.Optional.empty()

class EssayAnswerValidator extends ValidatorAction:

  private object AnswerValidator:
    def get(body: JsonNode): Either[ValidationException, EssayAnswerDTO] =
      Validator(EssayAnswerParser.parseFromJson).validate(body)

  private object EssayAnswerParser:
    def parseFromJson(body: JsonNode): EssayAnswerDTO =
      val answer        = Option(SanitizingHelper.parseHtml("answer", body)).getOrElse("")
      val objectVersion = SanitizingHelper.parse[Long]("objectVersion", body)
      EssayAnswerDTO(answer, objectVersion)

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    AnswerValidator.get(body) match
      case Right(answer) => req.addAttr(Attrs.ESSAY_ANSWER, answer)
      case Left(ex)      => throw ex
