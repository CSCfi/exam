// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.datetime

import com.google.inject.ImplementedBy
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.facility.{ExamMachine, ExamRoom}
import models.user.User
import play.api.libs.json.{JsValue, Json, Writes}
import play.api.mvc.Result

import java.time.format.DateTimeFormatter
import java.time.{Instant, LocalDate}
import scala.concurrent.Future

/** Error types for calendar handler operations */
sealed trait CalendarHandlerError:
  def message: String

object CalendarHandlerError:
  case class RoomNotFound(roomId: Long) extends CalendarHandlerError:
    val message = s"No room with id: ($roomId)"

@ImplementedBy(classOf[CalendarHandlerImpl])
trait CalendarHandler:
  def getSlots(
      user: User,
      exam: Exam,
      roomId: Long,
      day: String,
      aids: Seq[Long]
  ): Either[CalendarHandlerError, JsValue]

  def handleReservations(
      examSlots: Map[Interval, Option[Int]],
      reservations: Seq[Reservation],
      exam: Exam,
      machines: Seq[ExamMachine],
      user: User
  ): Set[CalendarHandler.TimeSlot]

  def gatherSuitableSlots(room: ExamRoom, date: LocalDate, examDuration: Integer): Seq[Interval]

  def parseSearchDate(day: String, exam: Exam, room: Option[ExamRoom]): Option[LocalDate]

  def getRandomMachine(
      room: ExamRoom,
      exam: Exam,
      start: Instant,
      end: Instant,
      aids: Seq[Long]
  ): Option[ExamMachine]

  def createReservation(
      start: Instant,
      end: Instant,
      machine: ExamMachine,
      user: User
  ): Reservation

  def getEndSearchDate(searchDate: LocalDate, examEnd: LocalDate): LocalDate

  def getReservationWindowSize: Int

  def isDoable(reservation: Reservation, aids: Seq[Long]): Boolean

  def handleExternalReservation(
      enrolment: ExamEnrolment,
      exam: Exam,
      node: JsValue,
      start: Instant,
      end: Instant,
      user: User,
      orgRef: String,
      roomRef: String,
      sectionIds: Seq[Long]
  ): Future[Option[Integer]]

  def postProcessSlots(
      node: JsValue,
      date: String,
      exam: Exam,
      user: User
  ): Set[CalendarHandler.TimeSlot]

  def checkEnrolment(enrolment: ExamEnrolment, user: User, sectionIds: Seq[Long]): Option[Result]

  def getEnrolment(examId: Long, user: User): ExamEnrolment

object CalendarHandler:
  case class TimeSlot(interval: Interval, machineCount: Int, exam: String):
    val start: String           = DateTimeFormatter.ISO_INSTANT.format(interval.start)
    val end: String             = DateTimeFormatter.ISO_INSTANT.format(interval.end)
    val availableMachines: Int  = machineCount
    val ownReservation: Boolean = machineCount < 0
    val conflictingExam: String = exam

  object TimeSlot:
    implicit val writes: Writes[TimeSlot] = (slot: TimeSlot) =>
      Json.obj(
        "start"             -> slot.start,
        "end"               -> slot.end,
        "availableMachines" -> slot.availableMachines,
        "ownReservation"    -> slot.ownReservation,
        "conflictingExam"   -> slot.conflictingExam
      )
