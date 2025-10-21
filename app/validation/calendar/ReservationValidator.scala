// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.calendar

import cats.data.ValidatedNel
import com.fasterxml.jackson.databind.JsonNode
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import validation.SanitizingException
import validation.core.*

import scala.jdk.CollectionConverters.*
import scala.util.Try

case class ReservationDTO(
    roomId: Long,
    examId: Long,
    start: DateTime,
    end: DateTime,
    aids: Option[List[Long]],
    sectionIds: Option[List[Long]]
):
  private def toJava(xs: Option[List[Long]]): java.util.List[java.lang.Long] =
    xs match
      case Some(list) => list.map(java.lang.Long.valueOf).asJava
      case None       => java.util.List.of()
  def getAidsAsJava: java.util.List[java.lang.Long]       = toJava(aids)
  def getSectionIdsAsJava: java.util.List[java.lang.Long] = toJava(sectionIds)

case class ExternalReservationDTO(
    roomRef: String,
    orgRef: String,
    examId: Long,
    start: DateTime,
    end: DateTime,
    sectionIds: Option[List[Long]]
):
  def getSectionIdsAsJava: java.util.List[java.lang.Long] =
    sectionIds match
      case Some(list) => list.map(java.lang.Long.valueOf).asJava
      case None       => java.util.List.of()

object ReservationValidator:
  def forCreation(body: JsonNode): Either[ValidationException, ReservationDTO] =
    Validator(ReservationParser.parseFromJson)
      .withRule(requireRoomId)
      .withRule(r => requireExamId(r.examId))
      .withRule(r => requireStartDate(r.start))
      .withRule(r => requireEndDate(r.end))
      .withRule(r => requireValidDateRange(r.start, r.end))
      .validate(body)

  def forCreationExternal(body: JsonNode): Either[ValidationException, ExternalReservationDTO] =
    Validator(ExternalReservationParser.parseFromJson)
      .withRule(requireRoomRef)
      .withRule(requireOrgRef)
      .withRule(r => requireExamId(r.examId))
      .withRule(r => requireStartDate(r.start))
      .withRule(r => requireEndDate(r.end))
      .withRule(r => requireValidDateRange(r.start, r.end))
      .validate(body)

  // Common validators - work on shared fields
  private def requireExamId(examId: Long): ValidatedNel[FieldError, Long] =
    Validator.requirePositive("examId", examId)

  private def requireStartDate(start: DateTime): ValidatedNel[FieldError, DateTime] =
    Validator.requirePresent("start", start)

  private def requireEndDate(end: DateTime): ValidatedNel[FieldError, DateTime] =
    Validator.requirePresent("end", end)

  private def requireValidDateRange(start: DateTime, end: DateTime): ValidatedNel[FieldError, Unit] =
    val isStartInPast    = start.isBeforeNow
    val isEndBeforeStart = end.isBefore(start)

    if isStartInPast then Validator.invalid("start", "Start date must be in the future")
    else if isEndBeforeStart then Validator.invalid("end", "End date must be after start date")
    else Validator.valid(())

  // ReservationDTO-specific validators
  private def requireRoomId(reservation: ReservationDTO): ValidatedNel[FieldError, Long] =
    Validator.requirePositive("roomId", reservation.roomId)

  // ExternalReservationDTO-specific validators
  private def requireRoomRef(reservation: ExternalReservationDTO): ValidatedNel[FieldError, String] =
    Validator.requireField("roomId", reservation.roomRef)

  private def requireOrgRef(reservation: ExternalReservationDTO): ValidatedNel[FieldError, String] =
    Validator.requireField("orgId", reservation.orgRef)

private object ReservationParser:

  def parseFromJson(body: JsonNode): ReservationDTO =
    val roomId = SanitizingHelper
      .parse[Long]("roomId", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: roomId"))
    val examId = SanitizingHelper
      .parse[Long]("examId", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: examId"))
    val start = Try {
      val startNode = Option(body.get("start"))
        .getOrElse(throw SanitizingException("Missing field: start"))
      DateTime.parse(startNode.asText(), ISODateTimeFormat.dateTimeParser())
    }.getOrElse(throw SanitizingException("Invalid date format: start"))
    val end = Try {
      val endNode = Option(body.get("end"))
        .getOrElse(throw SanitizingException("Missing field: end"))
      DateTime.parse(endNode.asText(), ISODateTimeFormat.dateTimeParser())
    }.getOrElse(throw SanitizingException("Invalid date format: end"))

    val aids       = SanitizingHelper.parseArray[java.lang.Long]("aids", body).map(_.map(_.toLong))
    val sectionIds = SanitizingHelper.parseArray[java.lang.Long]("sectionIds", body).map(_.map(_.toLong))

    ReservationDTO(roomId, examId, start, end, aids, sectionIds)

private object ExternalReservationParser:

  def parseFromJson(body: JsonNode): ExternalReservationDTO =
    val roomRef = SanitizingHelper
      .parse[String]("roomId", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: roomId"))

    val orgRef = SanitizingHelper
      .parse[String]("orgId", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: orgId"))

    val examId = SanitizingHelper
      .parse[Long]("examId", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: examId"))

    val start = Try {
      val startNode = Option(body.get("start"))
        .getOrElse(throw SanitizingException("Missing field: start"))
      DateTime.parse(startNode.asText(), ISODateTimeFormat.dateTimeParser())
    }.getOrElse(throw SanitizingException("Invalid date format: start"))

    val end = Try {
      val endNode = Option(body.get("end"))
        .getOrElse(throw SanitizingException("Missing field: end"))
      DateTime.parse(endNode.asText(), ISODateTimeFormat.dateTimeParser())
    }.getOrElse(throw SanitizingException("Invalid date format: end"))

    val sectionIds = SanitizingHelper.parseArray[java.lang.Long]("sectionIds", body).map(_.map(_.toLong))

    ExternalReservationDTO(roomRef, orgRef, examId, start, end, sectionIds)
