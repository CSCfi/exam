// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.exam

import cats.data.ValidatedNel
import play.api.libs.json.*
import play.api.mvc.{Request, Result, Results}
import validation.core.*

import java.time.Instant

case class ExaminationEventDTO(
    start: Instant,
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

    private def requireStartDate(event: ExaminationEventDTO): ValidatedNel[FieldError, Instant] =
      PlayValidator.requirePresent("start", event.start)

    private def requireDescription(event: ExaminationEventDTO): ValidatedNel[FieldError, String] =
      PlayValidator.requireField("description", event.description)

    private def requirePositiveCapacity(event: ExaminationEventDTO): ValidatedNel[FieldError, Int] =
      PlayValidator.requirePositive("capacity", event.capacity)

  private object EventParser:
    def parseFromJson(body: JsValue): Either[FieldError, ExaminationEventDTO] =
      def required[A](field: String, value: Option[A]) =
        value.toRight(FieldError(field, "missing or invalid"))
      for
        configNode <- required("config", (body \ "config").asOpt[JsValue])
        eventNode <-
          required("examinationEvent", (configNode \ "examinationEvent").asOpt[JsValue])
        start <- required("start", PlayJsonHelper.parseDateTime("start", eventNode))
        description <-
          required("description", (eventNode \ "description").asOpt[String].filter(_.nonEmpty))
        capacity <- required("capacity", (eventNode \ "capacity").asOpt[Int])
      yield
        val settingsPassword = (configNode \ "settingsPassword").asOpt[String].filter(_.nonEmpty)
        val quitPassword     = (configNode \ "quitPassword").asOpt[String].filter(_.nonEmpty)
        ExaminationEventDTO(start, description, capacity, settingsPassword, quitPassword)

  override def sanitize(
      request: Request[play.api.mvc.AnyContent],
      json: JsValue
  ): Either[Result, Request[play.api.mvc.AnyContent]] =
    EventValidator.get(json) match
      case Right(event) => Right(request.addAttr(ScalaAttrs.EXAMINATION_EVENT, event))
      case Left(ex)     => Left(Results.BadRequest(ex.getMessage))
