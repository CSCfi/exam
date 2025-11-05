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
import play.api.libs.json.JsValue
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

    def getStart: String           = start
    def getEnd: String             = end
    def getAvailableMachines: Int  = availableMachines
    def isOwnReservation: Boolean  = ownReservation
    def getConflictingExam: String = conflictingExam

    // Case class already provides equals and hashCode, but we need to match Java behavior
    override def equals(obj: Any): Boolean = obj match
      case that: TimeSlot => this.start == that.start && this.end == that.end
      case _              => false

    override def hashCode(): Int =
      31 * start.hashCode + end.hashCode
