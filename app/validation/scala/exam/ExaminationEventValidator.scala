// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.exam

import cats.data.ValidatedNel
import com.fasterxml.jackson.databind.JsonNode
import org.joda.time.DateTime
import play.api.libs.json.*
import play.mvc.Http
import validation.scala.core.*
import validation.java.core.{Attrs, ValidatorAction}

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
      val configNode = (body \ "config").asOpt[JsValue]
        .getOrElse(throw SanitizingException("missing required data"))

      val settingsPassword = (configNode \ "settingsPassword").asOpt[String]
        .filter(_.nonEmpty)

      val quitPassword = (configNode \ "quitPassword").asOpt[String]
        .filter(_.nonEmpty)

      val eventNode = (configNode \ "examinationEvent").asOpt[JsValue]
        .getOrElse(throw SanitizingException("missing examinationEvent"))

      val start = PlayJsonHelper
        .parseDateTime("start", eventNode)
        .getOrElse(throw SanitizingException("missing or invalid start date"))

      val description = (eventNode \ "description").asOpt[String]
        .filter(_.nonEmpty)
        .getOrElse(throw SanitizingException("missing description"))

      val capacity = (eventNode \ "capacity").asOpt[Int]
        .getOrElse(throw SanitizingException("missing or invalid capacity"))

      ExaminationEventDTO(start, description, capacity, settingsPassword, quitPassword)

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    val jsValue = Json.parse(body.toString)
    EventValidator.get(jsValue) match
      case Right(event) => req.addAttr(Attrs.EXAMINATION_EVENT, event)
      case Left(ex)     => throw ex
