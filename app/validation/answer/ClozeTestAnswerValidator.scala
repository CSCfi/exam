// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.answer

import cats.data.ValidatedNel
import com.fasterxml.jackson.databind.JsonNode
import play.mvc.Http
import validation.core.*

case class ClozeTestAnswerDTO(answer: String, objectVersion: Option[Long]):
  def getObjectVersionAsJava: java.util.Optional[java.lang.Long] =
    objectVersion match
      case Some(version) => java.util.Optional.of(java.lang.Long.valueOf(version))
      case None          => java.util.Optional.empty()

class ClozeTestAnswerValidator extends ValidatorAction:

  private object AnswerValidator:
    def get(body: JsonNode): Either[ValidationException, ClozeTestAnswerDTO] =
      Validator(ClozeTestAnswerParser.parseFromJson).withRule(requireJson).validate(body)

    private def requireJson(answer: ClozeTestAnswerDTO): ValidatedNel[FieldError, Unit] =
      Validator.when(answer.answer.trim.nonEmpty)(Validator.requireJson("answer", answer.answer))

  private object ClozeTestAnswerParser:
    def parseFromJson(body: JsonNode): ClozeTestAnswerDTO =
      val answer        = SanitizingHelper.parseOrElse[String]("answer", body, "")
      val objectVersion = SanitizingHelper.parse[Long]("objectVersion", body)
      ClozeTestAnswerDTO(answer, objectVersion)

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    AnswerValidator.get(body) match
      case Right(answer) => req.addAttr(Attrs.CLOZE_TEST_ANSWER, answer)
      case Left(ex)      => throw ex
