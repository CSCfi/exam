// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.answer

import cats.data.ValidatedNel
import play.api.libs.json.*
import play.api.libs.typedmap.TypedKey
import play.api.mvc.{Request, Result, Results, AnyContent}
import validation.scala.core.*

case class ClozeTestAnswerDTO(answer: String, objectVersion: Option[Long]):
  def getObjectVersionAsJava: java.util.Optional[java.lang.Long] =
    objectVersion match
      case Some(version) => java.util.Optional.of(java.lang.Long.valueOf(version))
      case None          => java.util.Optional.empty()

object ClozeTestAnswerValidator extends PlayJsonValidator:

  val CLOZE_TEST_ANSWER_KEY: TypedKey[ClozeTestAnswerDTO] = TypedKey[ClozeTestAnswerDTO]("clozeTestAnswer")

  private object AnswerValidator:
    def get(body: JsValue): Either[ValidationException, ClozeTestAnswerDTO] =
      PlayValidator(ClozeTestAnswerParser.parseFromJson).withRule(requireJson).validate(body)

    private def requireJson(answer: ClozeTestAnswerDTO): ValidatedNel[FieldError, Unit] =
      PlayValidator.when(answer.answer.trim.nonEmpty)(PlayValidator.requireJson("answer", answer.answer))

  private object ClozeTestAnswerParser:
    def parseFromJson(body: JsValue): ClozeTestAnswerDTO =
      // Answer can be either a string or a JSON object - stringify it
      val answer = (body \ "answer").asOpt[JsValue] match
        case Some(JsString(str)) => str // Already a string
        case Some(jsValue)       => Json.stringify(jsValue) // Object/Array - stringify
        case None                => ""
      val objectVersion = PlayJsonHelper.parse[Long]("objectVersion", body)
      ClozeTestAnswerDTO(answer, objectVersion)

  override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
    AnswerValidator.get(json) match
      case Right(answer) => Right(request.addAttr(CLOZE_TEST_ANSWER_KEY, answer))
      case Left(ex)      => Left(Results.BadRequest(ex.getMessage))
