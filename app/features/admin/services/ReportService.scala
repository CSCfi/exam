// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.DB
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.Exam
import models.exam.ExamState
import models.user.User
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import play.api.Logging
import services.excel.ExcelBuilder

import java.io.OutputStream
import javax.inject.Inject

class ReportService @Inject() (private val excelBuilder: ExcelBuilder)
    extends EbeanQueryExtensions with EbeanJsonExtensions with Logging:

  private val DTF = DateTimeFormat.forPattern("dd.MM.yyyy")

  def getStudents: List[User] =
    DB
      .find(classOf[User])
      .select("id, firstName, lastName")
      .where()
      .eq("roles.name", "STUDENT")
      .list

  def examNames: List[Exam] =
    DB
      .find(classOf[Exam])
      .select("id, name")
      .fetch("course", "id, name, code")
      .where()
      .isNotNull("name")
      .isNotNull("course")
      .isNull("parent") // only Exam prototypes
      .list

  def findExam(id: Long): Option[Exam] =
    DB.find(classOf[Exam]).where().idEq(id).isNotNull("course").find

  /** Streams the exam metadata sheet to the given output stream. Caller must close the stream. */
  def streamExamAsExcel(exam: Exam)(os: OutputStream): Unit = excelBuilder.streamExam(exam)(os)

  /** Streams the teacher's exams report. Caller must close the stream. */
  def streamTeacherExamsByDateAsExcel(uid: Long, from: String, to: String)(os: OutputStream): Unit =
    excelBuilder.streamTeacherExams(fetchTeacherExamsBetween(uid, from, to))(os)

  private def fetchTeacherExamsBetween(uid: Long, from: String, to: String): List[Exam] =
    val start = DateTime.parse(from, DTF)
    val end   = DateTime.parse(to, DTF)
    DB
      .find(classOf[Exam])
      .select("name, created, state, periodStart, periodEnd")
      .fetch("examType", "type")
      .fetch("course", "code, credits")
      .fetch("children", "state")
      .where()
      .between("created", start, end)
      .isNull("parent")
      .isNotNull("course")
      .eq("creator.id", uid)
      .orderBy("created")
      .list

  /** Returns a stream writer if the exam exists; caller must close the stream after writing. */
  def streamExamEnrolmentsAsExcel(id: Long): Option[OutputStream => Unit] =
    DB.find(classOf[Exam])
      .select("id")
      .fetch("examEnrolments", "enrolledOn")
      .fetch("examEnrolments.user", "firstName, lastName, identifier, eppn")
      .fetch("examEnrolments.reservation", "startAt")
      .where()
      .eq("id", id)
      .isNull("parent")
      .find
      .map(proto => (os: OutputStream) => excelBuilder.streamEnrolments(proto)(os))

  /** Streams the reviews report to the given output stream. Caller must close the stream. */
  def streamReviewsByDateAsExcel(from: String, to: String)(os: OutputStream): Unit =
    excelBuilder.streamReviews(fetchExamsGradedBetween(from, to))(os)

  private def fetchExamsGradedBetween(from: String, to: String): List[Exam] =
    val start = DateTime.parse(from, DTF)
    val end   = DateTime.parse(to, DTF)
    DB
      .find(classOf[Exam])
      .select("name, created, gradedTime, answerLanguage, state")
      .fetch("creator", "firstName, lastName")
      .fetch("gradedByUser", "firstName, lastName")
      .fetch("course", "code, credits")
      .fetch("grade", "name")
      .fetch("creditType", "type")
      .where()
      .between("gradedTime", start, end)
      .disjunction()
      .eq("state", ExamState.GRADED)
      .eq("state", ExamState.GRADED_LOGGED)
      .endJunction()
      .orderBy("creator.id")
      .list

  /** Streams the reservations report. Caller must close the stream. */
  def streamReservationsForRoomByDateAsExcel(roomId: Long, from: String, to: String)(
      os: OutputStream
  ): Unit =
    excelBuilder.streamReservations(fetchReservationsForRoomBetween(roomId, from, to))(os)

  private def fetchReservationsForRoomBetween(
      roomId: Long,
      from: String,
      to: String
  ): List[ExamEnrolment] =
    val start = DateTime.parse(from, DTF)
    val end   = DateTime.parse(to, DTF)
    DB
      .find(classOf[ExamEnrolment])
      .select("enrolledOn")
      .fetch("user", "id, firstName, lastName")
      .fetch("exam", "id, name")
      .fetch("reservation", "id, startAt, endAt")
      .fetch("reservation.machine", "id, name, ipAddress")
      .fetch("reservation.machine.room", "id, name, roomCode")
      .where()
      .gt("reservation.endAt", start)
      .lt("reservation.startAt", end)
      .eq("reservation.machine.room.id", roomId)
      .isNotNull("exam")
      .list

  /** Streams the all-exams report to the given output stream. Caller must close the stream. */
  def streamAllExamsAsExcel(from: String, to: String)(os: OutputStream): Unit =
    val start = DateTime.parse(from, DTF)
    val end   = DateTime.parse(to, DTF)
    val participations = DB
      .find(classOf[ExamParticipation])
      .select("started, ended, duration")
      .fetch("user", "id, firstName, lastName, email")
      .fetch("exam", "id, name, duration, state, gradedTime")
      .fetch("exam.gradedByUser", "id, firstName, lastName, email")
      .fetch("exam.course", "name, code")
      .fetch("exam.course.gradeScale", "description")
      .fetch("exam.gradeScale", "description")
      .fetch("exam.grade", "name")
      .fetch("exam.creditType", "type")
      .fetch("reservation", "id")
      .fetch("reservation.machine", "id, name, ipAddress")
      .fetch("reservation.machine.room", "id, name, roomCode")
      .fetch("reservation.externalReservation", "roomName, roomCode, machineName")
      .where()
      .gt("started", start)
      .lt("ended", end)
      .or()
      .eq("exam.state", ExamState.GRADED)
      .eq("exam.state", ExamState.GRADED_LOGGED)
      .eq("exam.state", ExamState.ARCHIVED)
      .endOr()
      .list
    excelBuilder.streamAllExams(participations)(os)

  /** Returns a stream writer if the student exists; caller must close the stream after writing. */
  def streamStudentActivityAsExcel(
      studentId: Long,
      from: String,
      to: String
  ): Option[OutputStream => Unit] =
    Option(DB.find(classOf[User], studentId)).map { student =>
      val participations = fetchStudentParticipations(studentId, from, to)
      (os: OutputStream) => excelBuilder.streamStudentActivity(student, participations)(os)
    }

  private def fetchStudentParticipations(
      studentId: Long,
      from: String,
      to: String
  ): List[ExamParticipation] =
    val start = DateTime.parse(from, DTF)
    val end   = DateTime.parse(to, DTF)
    DB
      .find(classOf[ExamParticipation])
      .select("started, ended, duration")
      .fetch("exam", "id, name, duration, state, gradedTime")
      .fetch("exam.gradedByUser", "id, firstName, lastName, email")
      .fetch("exam.course", "name, code")
      .fetch("exam.course.gradeScale", "description")
      .fetch("exam.gradeScale", "description")
      .fetch("exam.grade", "name")
      .fetch("exam.creditType", "type")
      .fetch("reservation", "id")
      .fetch("reservation.externalReservation", "roomName, roomCode, machineName")
      .fetch("reservation.machine", "id, name, ipAddress")
      .fetch("reservation.machine.room", "id, name, roomCode")
      .where()
      .gt("started", start)
      .lt("ended", end)
      .eq("user.id", studentId)
      .isNotNull("reservation")
      .list
