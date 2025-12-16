// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.exam

import cats.data.ValidatedNel
import org.joda.time.DateTime
import play.api.libs.json._
import play.api.mvc.{Request, Result, Results}
import validation.core._

case class ExaminationEventDTO(
    start: DateTime,
    description: String,
    capacity: Int,
    settingsPassword: Option[String],
    quitPassword: Option[String]
)
object ExaminationEventValidator extends PlayJsonValidator:

  private object EventValidator:
    def get(body: JsValue): Either[ValidationException, ExaminationEventDTO] =
      PlayValidator(EventParser.parseFromJson)
        .withRule(requireStartDate)
        .withRule(requireDescription)
        .withRule(requirePositiveCapacity)
        .validate(body)

    private def requireStartDate(event: ExaminationEventDTO): ValidatedNel[FieldError, DateTime] =
      PlayValidator.requirePresent("start", event.start)

    private def requireDescription(event: ExaminationEventDTO): ValidatedNel[FieldError, String] =
      PlayValidator.requireField("description", event.description)

    private def requirePositiveCapacity(event: ExaminationEventDTO): ValidatedNel[FieldError, Int] =
      PlayValidator.requirePositive("capacity", event.capacity)

  private object EventParser:
    def parseFromJson(body: JsValue): ExaminationEventDTO =
      val configNode = (body \ "config")
        .asOpt[JsValue]
        .getOrElse(throw SanitizingException("missing required data"))

      val settingsPassword = (configNode \ "settingsPassword")
        .asOpt[String]
        .filter(_.nonEmpty)

      val quitPassword = (configNode \ "quitPassword")
        .asOpt[String]
        .filter(_.nonEmpty)

      val eventNode = (configNode \ "examinationEvent")
        .asOpt[JsValue]
        .getOrElse(throw SanitizingException("missing examinationEvent"))

      val start = PlayJsonHelper
        .parseDateTime("start", eventNode)
        .getOrElse(throw SanitizingException("missing or invalid start date"))

      val description = (eventNode \ "description")
        .asOpt[String]
        .filter(_.nonEmpty)
        .getOrElse(throw SanitizingException("missing description"))

      val capacity = (eventNode \ "capacity")
        .asOpt[Int]
        .getOrElse(throw SanitizingException("missing or invalid capacity"))

      ExaminationEventDTO(start, description, capacity, settingsPassword, quitPassword)

  override def sanitize(
      request: Request[play.api.mvc.AnyContent],
      json: JsValue
  ): Either[Result, Request[play.api.mvc.AnyContent]] =
    EventValidator.get(json) match
      case Right(event) => Right(request.addAttr(ScalaAttrs.EXAMINATION_EVENT, event))
      case Left(ex)     => Left(Results.BadRequest(ex.getMessage))
