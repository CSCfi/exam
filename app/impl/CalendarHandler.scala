// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl

import com.google.inject.ImplementedBy
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.facility.{ExamMachine, ExamRoom}
import models.user.User
import org.joda.time.{DateTime, Interval, LocalDate}
import org.joda.time.format.ISODateTimeFormat
import play.api.libs.json.{Json, JsValue, Writes}
import play.api.mvc.Result

import scala.concurrent.Future

@ImplementedBy(classOf[CalendarHandlerImpl])
trait CalendarHandler:
  def getSlots(user: User, exam: Exam, roomId: Long, day: String, aids: Seq[Long]): Result

  def handleReservations(
      examSlots: Map[Interval, Option[Int]],
      reservations: Seq[Reservation],
      exam: Exam,
      machines: Seq[ExamMachine],
      user: User
  ): Set[CalendarHandler.TimeSlot]

  def gatherSuitableSlots(room: ExamRoom, date: LocalDate, examDuration: Integer): Seq[Interval]

  @throws[IllegalArgumentException]
  def parseSearchDate(day: String, exam: Exam, room: Option[ExamRoom]): LocalDate

  def getRandomMachine(
      room: ExamRoom,
      exam: Exam,
      start: DateTime,
      end: DateTime,
      aids: Seq[Long]
  ): Option[ExamMachine]

  def createReservation(start: DateTime, end: DateTime, machine: ExamMachine, user: User): Reservation

  def getEndSearchDate(searchDate: LocalDate, examEnd: LocalDate): LocalDate

  def getReservationWindowSize: Int

  def isDoable(reservation: Reservation, aids: Seq[Long]): Boolean

  def handleExternalReservation(
      enrolment: ExamEnrolment,
      exam: Exam,
      node: JsValue,
      start: DateTime,
      end: DateTime,
      user: User,
      orgRef: String,
      roomRef: String,
      sectionIds: Seq[Long]
  ): Future[Option[Integer]]

  def postProcessSlots(node: JsValue, date: String, exam: Exam, user: User): Set[CalendarHandler.TimeSlot]

  def normalizeMaintenanceTime(dateTime: DateTime): DateTime

  def checkEnrolment(enrolment: ExamEnrolment, user: User, sectionIds: Seq[Long]): Option[Result]

  def getEnrolment(examId: Long, user: User): ExamEnrolment

object CalendarHandler:
  case class TimeSlot(interval: Interval, machineCount: Int, exam: String):
    val start: String           = ISODateTimeFormat.dateTime().print(interval.getStart)
    val end: String             = ISODateTimeFormat.dateTime().print(interval.getEnd)
    val availableMachines: Int  = machineCount
    val ownReservation: Boolean = machineCount < 0
    val conflictingExam: String = exam

  object TimeSlot:
    // JSON serialization for TimeSlot (excludes the Interval field to avoid Joda serialization issues)
    implicit val writes: Writes[TimeSlot] = (slot: TimeSlot) =>
      Json.obj(
        "start"             -> slot.start,
        "end"               -> slot.end,
        "availableMachines" -> slot.availableMachines,
        "ownReservation"    -> slot.ownReservation,
        "conflictingExam"   -> slot.conflictingExam
      )
