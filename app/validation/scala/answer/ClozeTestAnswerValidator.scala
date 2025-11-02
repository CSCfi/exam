// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.answer

import cats.data.ValidatedNel
import com.fasterxml.jackson.databind.JsonNode
import play.api.libs.json.*
import play.mvc.Http
import validation.scala.core.*
import validation.java.core.{Attrs, ValidatorAction}

case class ClozeTestAnswerDTO(answer: String, objectVersion: Option[Long]):
  def getObjectVersionAsJava: java.util.Optional[java.lang.Long] =
    objectVersion match
      case Some(version) => java.util.Optional.of(java.lang.Long.valueOf(version))
      case None          => java.util.Optional.empty()

class ClozeTestAnswerValidator extends ValidatorAction:

  private object AnswerValidator:
    def get(body: JsValue): Either[ValidationException, ClozeTestAnswerDTO] =
      PlayValidator(ClozeTestAnswerParser.parseFromJson).withRule(requireJson).validate(body)

    private def requireJson(answer: ClozeTestAnswerDTO): ValidatedNel[FieldError, Unit] =
      PlayValidator.when(answer.answer.trim.nonEmpty)(PlayValidator.requireJson("answer", answer.answer))

  private object ClozeTestAnswerParser:
    def parseFromJson(body: JsValue): ClozeTestAnswerDTO =
      val answer        = PlayJsonHelper.parseOrElse[String]("answer", body, "")
      val objectVersion = PlayJsonHelper.parse[Long]("objectVersion", body)
      ClozeTestAnswerDTO(answer, objectVersion)

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    // Convert Jackson JsonNode to Play JsValue
    val jsValue = Json.parse(body.toString)
    AnswerValidator.get(jsValue) match
      case Right(answer) => req.addAttr(Attrs.CLOZE_TEST_ANSWER, answer)
      case Left(ex)      => throw ex
