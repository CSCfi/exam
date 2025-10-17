// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.exam

import cats.data.ValidatedNel
import com.fasterxml.jackson.databind.JsonNode
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.mvc.Http
import validation.SanitizingException
import validation.core.*

import scala.util.Try

case class ExaminationEventDTO(
    start: DateTime,
    description: String,
    capacity: Int,
    settingsPassword: Option[String],
    quitPassword: Option[String]
):
  def getSettingsPasswordAsJava: java.util.Optional[String] =
    settingsPassword match
      case Some(pwd) => java.util.Optional.of(pwd)
      case None      => java.util.Optional.empty()

  def getQuitPasswordAsJava: java.util.Optional[String] =
    quitPassword match
      case Some(pwd) => java.util.Optional.of(pwd)
      case None      => java.util.Optional.empty()

class ExaminationEventValidator extends ValidatorAction:

  private object EventValidator:
    def get(body: JsonNode): Either[ValidationException, ExaminationEventDTO] =
      Validator(EventParser.parseFromJson)
        .withRule(requireStartDate)
        .withRule(requireDescription)
        .withRule(requirePositiveCapacity)
        .validate(body)

    private def requireStartDate(event: ExaminationEventDTO): ValidatedNel[FieldError, DateTime] =
      Validator.requirePresent("start", event.start)

    private def requireDescription(event: ExaminationEventDTO): ValidatedNel[FieldError, String] =
      Validator.requireField("description", event.description)

    private def requirePositiveCapacity(event: ExaminationEventDTO): ValidatedNel[FieldError, Int] =
      Validator.requirePositive("capacity", event.capacity)

  private object EventParser:
    def parseFromJson(body: JsonNode): ExaminationEventDTO =
      val configNode = Option(body.get("config"))
        .getOrElse(throw SanitizingException("missing required data"))

      val settingsPassword = Option(configNode.path("settingsPassword").asText(null))
        .filter(_ != null)
        .filter(_.nonEmpty)

      val quitPassword = Option(configNode.path("quitPassword").asText(null))
        .filter(_ != null)
        .filter(_.nonEmpty)

      val eventNode = Option(configNode.get("examinationEvent"))
        .getOrElse(throw SanitizingException("missing examinationEvent"))

      val start = Try {
        val startText = Option(eventNode.get("start"))
          .map(_.asText())
          .getOrElse(throw SanitizingException("missing start date"))
        DateTime.parse(startText, ISODateTimeFormat.dateTime())
      }.getOrElse(throw SanitizingException("invalid date format"))

      val description = Option(eventNode.get("description"))
        .map(_.asText())
        .filter(_.nonEmpty)
        .getOrElse(throw SanitizingException("missing description"))

      val capacity = Try {
        eventNode.get("capacity").asInt()
      }.getOrElse(throw SanitizingException("missing or invalid capacity"))

      ExaminationEventDTO(start, description, capacity, settingsPassword, quitPassword)

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    EventValidator.get(body) match
      case Right(event) => req.addAttr(Attrs.EXAMINATION_EVENT, event)
      case Left(ex)     => throw ex
