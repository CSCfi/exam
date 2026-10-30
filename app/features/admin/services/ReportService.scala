// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.services

import database.EbeanPaths.path
import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.DB
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.Exam
import models.exam.ExamState
import models.user.User
import play.api.Logging
import services.excel.ExcelBuilder

import java.io.OutputStream
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import javax.inject.Inject

class ReportService @Inject() (private val excelBuilder: ExcelBuilder)
    extends EbeanQueryExtensions with EbeanJsonExtensions with Logging:

  private val DTF = DateTimeFormatter.ofPattern("dd.MM.yyyy")

  def getStudents: List[User] =
    DB
      .find(classOf[User])
      .select("id, firstName, lastName")
      .where()
      .eq(path[User]("roles.name"), "STUDENT")
      .list

  def examNames: List[Exam] =
    DB
      .find(classOf[Exam])
      .select("id, name")
      .fetch(path[Exam]("course"), "id, name, code")
      .where()
      .isNotNull(path[Exam]("name"))
      .isNotNull(path[Exam]("course"))
      .isNull(path[Exam]("parent")) // only Exam prototypes
      .list

  def findExam(id: Long): Option[Exam] =
    DB.find(classOf[Exam]).where().idEq(id).isNotNull(path[Exam]("course")).find

  /** Streams the exam metadata sheet to the given output stream. Caller must close the stream. */
  def streamExamAsExcel(exam: Exam)(os: OutputStream): Unit = excelBuilder.streamExam(exam)(os)

  /** Streams the teacher's exams report. Caller must close the stream. */
  def streamTeacherExamsByDateAsExcel(uid: Long, from: String, to: String)(os: OutputStream): Unit =
    excelBuilder.streamTeacherExams(fetchTeacherExamsBetween(uid, from, to))(os)

  private def fetchTeacherExamsBetween(uid: Long, from: String, to: String): List[Exam] =
    val start = java.time.LocalDate.parse(from, DTF).atStartOfDay(ZoneOffset.UTC).toInstant
    val end   = java.time.LocalDate.parse(to, DTF).atStartOfDay(ZoneOffset.UTC).toInstant
    DB
      .find(classOf[Exam])
      .select("name, created, state, periodStart, periodEnd")
      .fetch(path[Exam]("examType"), "type")
      .fetch(path[Exam]("course"), "code, credits")
      .fetch(path[Exam]("children"), "state")
      .where()
      .between(path[Exam]("created"), start, end)
      .isNull(path[Exam]("parent"))
      .isNotNull(path[Exam]("course"))
      .eq(path[Exam]("creator.id"), uid)
      .orderBy(path[Exam]("created"))
      .list

  /** Returns a stream writer if the exam exists; caller must close the stream after writing. */
  def streamExamEnrolmentsAsExcel(id: Long): Option[OutputStream => Unit] =
    DB.find(classOf[Exam])
      .select(path[Exam]("id"))
      .fetch(path[Exam]("examEnrolments"), "enrolledOn")
      .fetch(path[Exam]("examEnrolments.user"), "firstName, lastName, identifier, eppn")
      .fetch(path[Exam]("examEnrolments.reservation"), "startAt")
      .where()
      .eq(path[Exam]("id"), id)
      .isNull(path[Exam]("parent"))
      .find
      .map(proto => (os: OutputStream) => excelBuilder.streamEnrolments(proto)(os))

  /** Streams the reviews report to the given output stream. Caller must close the stream. */
  def streamReviewsByDateAsExcel(from: String, to: String)(os: OutputStream): Unit =
    excelBuilder.streamReviews(fetchExamsGradedBetween(from, to))(os)

  private def fetchExamsGradedBetween(from: String, to: String): List[Exam] =
    val start = java.time.LocalDate.parse(from, DTF).atStartOfDay(ZoneOffset.UTC).toInstant
    val end   = java.time.LocalDate.parse(to, DTF).atStartOfDay(ZoneOffset.UTC).toInstant
    DB
      .find(classOf[Exam])
      .select("name, created, gradedTime, answerLanguage, state")
      .fetch(path[Exam]("creator"), "firstName, lastName")
      .fetch(path[Exam]("gradedByUser"), "firstName, lastName")
      .fetch(path[Exam]("course"), "code, credits")
      .fetch(path[Exam]("grade"), "name")
      .fetch(path[Exam]("creditType"), "type")
      .where()
      .between(path[Exam]("gradedTime"), start, end)
      .disjunction()
      .eq(path[Exam]("state"), ExamState.GRADED)
      .eq(path[Exam]("state"), ExamState.GRADED_LOGGED)
      .endJunction()
      .orderBy(path[Exam]("creator.id"))
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
    val start = java.time.LocalDate.parse(from, DTF).atStartOfDay(ZoneOffset.UTC).toInstant
    val end   = java.time.LocalDate.parse(to, DTF).atStartOfDay(ZoneOffset.UTC).toInstant
    DB
      .find(classOf[ExamEnrolment])
      .select(path[ExamEnrolment]("enrolledOn"))
      .fetch(path[ExamEnrolment]("user"), "id, firstName, lastName")
      .fetch(path[ExamEnrolment]("exam"), "id, name")
      .fetch(path[ExamEnrolment]("reservation"), "id, startAt, endAt")
      .fetch(path[ExamEnrolment]("reservation.machine"), "id, name, ipAddress")
      .fetch(path[ExamEnrolment]("reservation.machine.room"), "id, name, roomCode")
      .where()
      .gt(path[ExamEnrolment]("reservation.endAt"), start)
      .lt(path[ExamEnrolment]("reservation.startAt"), end)
      .eq(path[ExamEnrolment]("reservation.machine.room.id"), roomId)
      .isNotNull(path[ExamEnrolment]("exam"))
      .list

  /** Streams the all-exams report to the given output stream. Caller must close the stream. */
  def streamAllExamsAsExcel(from: String, to: String)(os: OutputStream): Unit =
    val start = java.time.LocalDate.parse(from, DTF).atStartOfDay(ZoneOffset.UTC).toInstant
    val end   = java.time.LocalDate.parse(to, DTF).atStartOfDay(ZoneOffset.UTC).toInstant
    val participations = DB
      .find(classOf[ExamParticipation])
      .select("started, ended, duration")
      .fetch(path[ExamParticipation]("user"), "id, firstName, lastName, email")
      .fetch(path[ExamParticipation]("exam"), "id, name, duration, state, gradedTime")
      .fetch(path[ExamParticipation]("exam.gradedByUser"), "id, firstName, lastName, email")
      .fetch(path[ExamParticipation]("exam.course"), "name, code")
      .fetch(path[ExamParticipation]("exam.course.gradeScale"), "description")
      .fetch(path[ExamParticipation]("exam.gradeScale"), "description")
      .fetch(path[ExamParticipation]("exam.grade"), "name")
      .fetch(path[ExamParticipation]("exam.creditType"), "type")
      .fetch(path[ExamParticipation]("reservation"), "id")
      .fetch(path[ExamParticipation]("reservation.machine"), "id, name, ipAddress")
      .fetch(path[ExamParticipation]("reservation.machine.room"), "id, name, roomCode")
      .fetch(
        path[ExamParticipation]("reservation.externalReservation"),
        "roomName, roomCode, machineName"
      )
      .where()
      .gt(path[ExamParticipation]("started"), start)
      .lt(path[ExamParticipation]("ended"), end)
      .or()
      .eq(path[ExamParticipation]("exam.state"), ExamState.GRADED)
      .eq(path[ExamParticipation]("exam.state"), ExamState.GRADED_LOGGED)
      .eq(path[ExamParticipation]("exam.state"), ExamState.ARCHIVED)
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

  /** Streams a generic report. Caller must close the stream. */
  def streamGenericReportAsExcel(headers: List[String], rows: List[List[String]])(
      os: OutputStream
  ): Unit =
    excelBuilder.streamGenericReport(headers, rows)(os)

  private def fetchStudentParticipations(
      studentId: Long,
      from: String,
      to: String
  ): List[ExamParticipation] =
    val start = java.time.LocalDate.parse(from, DTF).atStartOfDay(ZoneOffset.UTC).toInstant
    val end   = java.time.LocalDate.parse(to, DTF).atStartOfDay(ZoneOffset.UTC).toInstant
    DB
      .find(classOf[ExamParticipation])
      .select("started, ended, duration")
      .fetch(path[ExamParticipation]("exam"), "id, name, duration, state, gradedTime")
      .fetch(path[ExamParticipation]("exam.gradedByUser"), "id, firstName, lastName, email")
      .fetch(path[ExamParticipation]("exam.course"), "name, code")
      .fetch(path[ExamParticipation]("exam.course.gradeScale"), "description")
      .fetch(path[ExamParticipation]("exam.gradeScale"), "description")
      .fetch(path[ExamParticipation]("exam.grade"), "name")
      .fetch(path[ExamParticipation]("exam.creditType"), "type")
      .fetch(path[ExamParticipation]("reservation"), "id")
      .fetch(
        path[ExamParticipation]("reservation.externalReservation"),
        "roomName, roomCode, machineName"
      )
      .fetch(path[ExamParticipation]("reservation.machine"), "id, name, ipAddress")
      .fetch(path[ExamParticipation]("reservation.machine.room"), "id, name, roomCode")
      .where()
      .gt(path[ExamParticipation]("started"), start)
      .lt(path[ExamParticipation]("ended"), end)
      .eq(path[ExamParticipation]("user.id"), studentId)
      .isNotNull(path[ExamParticipation]("reservation"))
      .list
