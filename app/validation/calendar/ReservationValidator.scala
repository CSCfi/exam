// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.calendar

import cats.data.ValidatedNel
import org.joda.time.DateTime
import play.api.libs.json._
import validation.core.SanitizingException
import validation.core._

import scala.jdk.CollectionConverters._

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
  def forCreation(body: JsValue): Either[ValidationException, ReservationDTO] =
    PlayValidator(ReservationParser.parseFromJson)
      .withRule(requireRoomId)
      .withRule(r => requireExamId(r.examId))
      .withRule(r => requireStartDate(r.start))
      .withRule(r => requireEndDate(r.end))
      .withRule(r => requireValidDateRange(r.start, r.end))
      .validate(body)

  def forCreationExternal(body: JsValue): Either[ValidationException, ExternalReservationDTO] =
    PlayValidator(ExternalReservationParser.parseFromJson)
      .withRule(requireRoomRef)
      .withRule(requireOrgRef)
      .withRule(r => requireExamId(r.examId))
      .withRule(r => requireStartDate(r.start))
      .withRule(r => requireEndDate(r.end))
      .withRule(r => requireValidDateRange(r.start, r.end))
      .validate(body)

  // Common validators - work on shared fields
  private def requireExamId(examId: Long): ValidatedNel[FieldError, Long] =
    PlayValidator.requirePositive("examId", examId)

  private def requireStartDate(start: DateTime): ValidatedNel[FieldError, DateTime] =
    PlayValidator.requirePresent("start", start)

  private def requireEndDate(end: DateTime): ValidatedNel[FieldError, DateTime] =
    PlayValidator.requirePresent("end", end)

  private def requireValidDateRange(start: DateTime, end: DateTime): ValidatedNel[FieldError, Unit] =
    val isStartInPast    = start.isBeforeNow
    val isEndBeforeStart = end.isBefore(start)

    if isStartInPast then PlayValidator.invalid("start", "Start date must be in the future")
    else if isEndBeforeStart then PlayValidator.invalid("end", "End date must be after start date")
    else PlayValidator.valid(())

  // ReservationDTO-specific validators
  private def requireRoomId(reservation: ReservationDTO): ValidatedNel[FieldError, Long] =
    PlayValidator.requirePositive("roomId", reservation.roomId)

  // ExternalReservationDTO-specific validators
  private def requireRoomRef(reservation: ExternalReservationDTO): ValidatedNel[FieldError, String] =
    PlayValidator.requireField("roomId", reservation.roomRef)

  private def requireOrgRef(reservation: ExternalReservationDTO): ValidatedNel[FieldError, String] =
    PlayValidator.requireField("orgId", reservation.orgRef)

private object ReservationParser:

  def parseFromJson(body: JsValue): ReservationDTO =
    val roomId = PlayJsonHelper
      .parse[Long]("roomId", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: roomId"))
    val examId = PlayJsonHelper
      .parse[Long]("examId", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: examId"))
    val start = PlayJsonHelper
      .parseDateTime("start", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: start"))
    val end = PlayJsonHelper
      .parseDateTime("end", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: end"))

    val aids       = PlayJsonHelper.parseLongArray("aids", body)
    val sectionIds = PlayJsonHelper.parseLongArray("sectionIds", body)

    ReservationDTO(roomId, examId, start, end, aids, sectionIds)

private object ExternalReservationParser:

  def parseFromJson(body: JsValue): ExternalReservationDTO =
    val roomRef = PlayJsonHelper
      .parse[String]("roomId", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: roomId"))

    val orgRef = PlayJsonHelper
      .parse[String]("orgId", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: orgId"))

    val examId = PlayJsonHelper
      .parse[Long]("examId", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: examId"))

    val start = PlayJsonHelper
      .parseDateTime("start", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: start"))

    val end = PlayJsonHelper
      .parseDateTime("end", body)
      .getOrElse(throw SanitizingException("Missing or invalid field: end"))

    val sectionIds = PlayJsonHelper.parseLongArray("sectionIds", body)

    ExternalReservationDTO(roomRef, orgRef, examId, start, end, sectionIds)
