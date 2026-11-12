// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.calendar

import cats.data.ValidatedNel
import play.api.libs.json.*
import validation.core.*

import java.time.Instant
import scala.jdk.CollectionConverters.*

case class ReservationDTO(
    roomId: Long,
    examId: Long,
    start: Instant,
    end: Instant,
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
    start: Instant,
    end: Instant,
    sectionIds: Option[List[Long]]
):
  def getSectionIdsAsJava: java.util.List[java.lang.Long] =
    sectionIds match
      case Some(list) => list.map(java.lang.Long.valueOf).asJava
      case None       => java.util.List.of()

object ReservationValidator:
  def forCreation(
      body: JsValue,
      now: Instant = Instant.now()
  ): Either[ValidationException, ReservationDTO] =
    PlayValidator(ReservationParser.parseFromJson)
      .withRule(requireRoomId)
      .withRule(r => requireExamId(r.examId))
      .withRule(r => requireStartDate(r.start))
      .withRule(r => requireEndDate(r.end))
      .withRule(r => requireValidDateRange(r.start, r.end, now))
      .validate(body)

  def forCreationExternal(
      body: JsValue,
      now: Instant = Instant.now()
  ): Either[ValidationException, ExternalReservationDTO] =
    PlayValidator(ExternalReservationParser.parseFromJson)
      .withRule(requireRoomRef)
      .withRule(requireOrgRef)
      .withRule(r => requireExamId(r.examId))
      .withRule(r => requireStartDate(r.start))
      .withRule(r => requireEndDate(r.end))
      .withRule(r => requireValidDateRange(r.start, r.end, now))
      .validate(body)

  // Common validators - work on shared fields
  private def requireExamId(examId: Long): ValidatedNel[FieldError, Long] =
    PlayValidator.requirePositive("examId", examId)

  private def requireStartDate(start: Instant): ValidatedNel[FieldError, Instant] =
    PlayValidator.requirePresent("start", start)

  private def requireEndDate(end: Instant): ValidatedNel[FieldError, Instant] =
    PlayValidator.requirePresent("end", end)

  private def requireValidDateRange(
      start: Instant,
      end: Instant,
      now: Instant
  ): ValidatedNel[FieldError, Unit] =
    val isStartInPast    = start.isBefore(now)
    val isEndBeforeStart = end.isBefore(start)

    if isStartInPast then PlayValidator.invalid("start", "Start date must be in the future")
    else if isEndBeforeStart then PlayValidator.invalid("end", "End date must be after start date")
    else PlayValidator.valid(())

  // ReservationDTO-specific validators
  private def requireRoomId(reservation: ReservationDTO): ValidatedNel[FieldError, Long] =
    PlayValidator.requirePositive("roomId", reservation.roomId)

  // ExternalReservationDTO-specific validators
  private def requireRoomRef(reservation: ExternalReservationDTO)
      : ValidatedNel[FieldError, String] =
    PlayValidator.requireField("roomId", reservation.roomRef)

  private def requireOrgRef(reservation: ExternalReservationDTO): ValidatedNel[FieldError, String] =
    PlayValidator.requireField("orgId", reservation.orgRef)

private def required[A](field: String, value: Option[A]): Either[FieldError, A] =
  value.toRight(FieldError(field, "missing or invalid"))

private object ReservationParser:

  def parseFromJson(body: JsValue): Either[FieldError, ReservationDTO] =
    for
      roomId <- required("roomId", PlayJsonHelper.parse[Long]("roomId", body))
      examId <- required("examId", PlayJsonHelper.parse[Long]("examId", body))
      start  <- required("start", PlayJsonHelper.parseDateTime("start", body))
      end    <- required("end", PlayJsonHelper.parseDateTime("end", body))
    yield
      val aids       = PlayJsonHelper.parseLongArray("aids", body)
      val sectionIds = PlayJsonHelper.parseLongArray("sectionIds", body)
      ReservationDTO(roomId, examId, start, end, aids, sectionIds)

private object ExternalReservationParser:

  def parseFromJson(body: JsValue): Either[FieldError, ExternalReservationDTO] =
    for
      roomRef <- required("roomId", PlayJsonHelper.parse[String]("roomId", body))
      orgRef  <- required("orgId", PlayJsonHelper.parse[String]("orgId", body))
      examId  <- required("examId", PlayJsonHelper.parse[Long]("examId", body))
      start   <- required("start", PlayJsonHelper.parseDateTime("start", body))
      end     <- required("end", PlayJsonHelper.parseDateTime("end", body))
    yield
      val sectionIds = PlayJsonHelper.parseLongArray("sectionIds", body)
      ExternalReservationDTO(roomRef, orgRef, examId, start, end, sectionIds)
