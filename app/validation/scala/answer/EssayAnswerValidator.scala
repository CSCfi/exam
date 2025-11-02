// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.answer

import com.fasterxml.jackson.databind.JsonNode
import play.api.libs.json.*
import play.mvc.Http
import validation.scala.core.*
import validation.java.core.{Attrs, ValidatorAction}

case class EssayAnswerDTO(answer: String, objectVersion: Option[Long]):
  def getObjectVersionAsJava: java.util.Optional[java.lang.Long] =
    objectVersion match
      case Some(version) => java.util.Optional.of(java.lang.Long.valueOf(version))
      case None          => java.util.Optional.empty()

class EssayAnswerValidator extends ValidatorAction:

  private object AnswerValidator:
    def get(body: JsValue): Either[ValidationException, EssayAnswerDTO] =
      PlayValidator(EssayAnswerParser.parseFromJson).validate(body)

  private object EssayAnswerParser:
    def parseFromJson(body: JsValue): EssayAnswerDTO =
      val answer        = PlayJsonHelper.parseHtml("answer", body).getOrElse("")
      val objectVersion = PlayJsonHelper.parse[Long]("objectVersion", body)
      EssayAnswerDTO(answer, objectVersion)

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    // Convert Jackson JsonNode to Play JsValue
    val jsValue = Json.parse(body.toString)
    AnswerValidator.get(jsValue) match
      case Right(answer) => req.addAttr(Attrs.ESSAY_ANSWER, answer)
      case Left(ex)      => throw ex
