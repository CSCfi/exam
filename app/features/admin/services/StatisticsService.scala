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
import org.apache.poi.ss.usermodel.{Sheet, Workbook}
import org.joda.time.DateTime
import org.joda.time.format.{DateTimeFormat, ISODateTimeFormat}
import play.api.Logging
import services.excel.ExcelBuilder

import java.io.OutputStream
import javax.inject.Inject
import scala.jdk.CollectionConverters.*
import scala.util.Try

class StatisticsService @Inject() (private val excelBuilder: ExcelBuilder)
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
  def streamExamAsExcel(exam: Exam)(os: OutputStream): Unit =
    excelBuilder.streamTo(os)(wb => buildExamSheet(wb, exam))

  private def buildExamSheet(wb: Workbook, exam: Exam): Unit =
    val values = Map(
      "Creator ID"       -> exam.creator.id.toString,
      "First name"       -> exam.creator.firstName,
      "Last name"        -> exam.creator.lastName,
      "Exam type"        -> exam.examType.`type`,
      "Course code"      -> exam.course.code,
      "Course name"      -> exam.course.name,
      "Course credits"   -> exam.course.credits.toString,
      "Course unit type" -> forceNotNull(exam.course.courseUnitType),
      "Course level"     -> forceNotNull(exam.course.level),
      "Created"          -> ISODateTimeFormat.date().print(new DateTime(exam.created)),
      "Begins"           -> ISODateTimeFormat.date().print(new DateTime(exam.periodStart)),
      "Ends"             -> ISODateTimeFormat.date().print(new DateTime(exam.periodEnd)),
      "Duration"         -> Option(exam.duration).map(_.toString).getOrElse("N/A"),
      "Grade scale"      -> Option(exam.gradeScale).map(_.description).getOrElse("N/A"),
      "State"            -> exam.state.toString,
      "Attachment" -> Option(exam.attachment).map(a =>
        s"${a.filePath}${a.fileName}"
      ).getOrElse(""),
      "Instructions" -> forceNotNull(exam.instruction),
      "Shared"       -> exam.shared.toString
    )
    val sheet     = wb.createSheet(exam.name)
    val headerRow = sheet.createRow(0)
    values.keys.zipWithIndex.foreach { case (key, i) =>
      headerRow.createCell(i).setCellValue(key)
    }
    val dataRow = sheet.createRow(1)
    values.values.zipWithIndex.foreach { case (value, i) =>
      dataRow.createCell(i).setCellValue(value)
    }

  /** Streams the teacher's exams report. Caller must close the stream. */
  def streamTeacherExamsByDateAsExcel(uid: Long, from: String, to: String)(os: OutputStream): Unit =
    val exams = fetchTeacherExamsBetween(uid, from, to)
    excelBuilder.streamTo(os)(wb => buildTeacherExamsSheet(wb, exams))

  private def fetchTeacherExamsBetween(uid: Long, from: String, to: String): List[Exam] =
    val start = DateTime.parse(from, DTF)
    val end   = DateTime.parse(to, DTF)
    DB
      .find(classOf[Exam])
      .fetch("creator")
      .fetch("examType")
      .fetch("course")
      .fetch("children")
      .where()
      .between("created", start, end)
      .isNull("parent")
      .isNotNull("course")
      .eq("creator.id", uid)
      .orderBy("created")
      .list

  private def buildTeacherExamsSheet(wb: Workbook, exams: List[Exam]): Unit =
    val sheet = wb.createSheet("teacher's exams")
    addHeader(
      sheet,
      Array(
        "exam",
        "created",
        "state",
        "course code",
        "active during",
        "credits",
        "exam type",
        "in review",
        "graded",
        "logged"
      )
    )
    exams.zipWithIndex.foreach { case (parent, idx) =>
      val (inReview, graded, logged) =
        parent.children.asScala.foldLeft((0, 0, 0)) { case ((ir, g, l), child) =>
          child.state match
            case ExamState.REVIEW | ExamState.REVIEW_STARTED => (ir + 1, g, l)
            case ExamState.GRADED                            => (ir, g + 1, l)
            case ExamState.GRADED_LOGGED                     => (ir, g, l + 1)
            case _                                           => (ir, g, l)
        }
      val data = Array(
        parent.name,
        ISODateTimeFormat.date().print(new DateTime(parent.created)),
        parent.state.toString,
        parent.course.code,
        s"${ISODateTimeFormat.date().print(
            new DateTime(parent.periodStart)
          )} - ${ISODateTimeFormat.date().print(new DateTime(parent.periodEnd))}",
        Option(parent.course.credits).map(_.toString).getOrElse(""),
        parent.examType.`type`,
        inReview.toString,
        graded.toString,
        logged.toString
      )
      createRow(sheet, data, idx + 1)
    }
    (0 to 9).foreach(i => sheet.autoSizeColumn(i, true))

  /** Returns a stream writer if the exam exists; caller must close the stream after writing. */
  def streamExamEnrolmentsAsExcel(id: Long): Option[OutputStream => Unit] =
    DB.find(classOf[Exam])
      .fetch("examEnrolments")
      .fetch("examEnrolments.user")
      .fetch("examEnrolments.reservation")
      .fetch("course")
      .where()
      .eq("id", id)
      .isNull("parent")
      .find
      .map { proto => (os: OutputStream) =>
        excelBuilder.streamTo(os)(wb => buildEnrollmentsSheet(wb, proto))
      }

  private def buildEnrollmentsSheet(wb: Workbook, proto: Exam): Unit =
    val sheet = wb.createSheet("enrolments")
    addHeader(
      sheet,
      Array(
        "student name",
        "student ID",
        "student EPPN",
        "reservation time",
        "enrolment time"
      )
    )
    proto.examEnrolments.asScala.zipWithIndex.foreach { case (e, idx) =>
      val data = Array(
        s"${e.user.firstName} ${e.user.lastName}",
        forceNotNull(e.user.identifier),
        e.user.eppn,
        Option(e.reservation)
          .map(r => ISODateTimeFormat.dateTimeNoMillis().print(new DateTime(r.startAt)))
          .getOrElse(""),
        ISODateTimeFormat.dateTimeNoMillis().print(new DateTime(e.enrolledOn))
      )
      createRow(sheet, data, idx + 1)
    }
    (0 to 4).foreach(i => sheet.autoSizeColumn(i, true))

  /** Streams the reviews report to the given output stream. Caller must close the stream. */
  def streamReviewsByDateAsExcel(from: String, to: String)(os: OutputStream): Unit =
    val exams = fetchExamsGradedBetween(from, to)
    excelBuilder.streamTo(os)(wb => buildReviewsSheet(wb, exams))

  private def fetchExamsGradedBetween(from: String, to: String): List[Exam] =
    val start = DateTime.parse(from, DTF)
    val end   = DateTime.parse(to, DTF)
    DB
      .find(classOf[Exam])
      .fetch("course")
      .where()
      .between("gradedTime", start, end)
      .disjunction()
      .eq("state", ExamState.GRADED)
      .eq("state", ExamState.GRADED_LOGGED)
      .endJunction()
      .orderBy("creator.id")
      .list

  private def buildReviewsSheet(wb: Workbook, exams: List[Exam]): Unit =
    val sheet = wb.createSheet("graded exams")
    addHeader(
      sheet,
      Array(
        "student",
        "exam",
        "course",
        "taken on",
        "graded on",
        "graded by",
        "credits",
        "grade",
        "exam type",
        "answer language"
      )
    )
    exams.zipWithIndex.foreach { case (e, idx) =>
      val data = Array(
        s"${e.creator.firstName} ${e.creator.lastName}",
        e.name,
        e.course.code,
        ISODateTimeFormat.dateTimeNoMillis().print(new DateTime(e.created)),
        ISODateTimeFormat.dateTimeNoMillis().print(new DateTime(e.gradedTime)),
        safeParse(() => s"${e.gradedByUser.firstName} ${e.gradedByUser.lastName}"),
        Option(e.course.credits).map(_.toString).getOrElse(""),
        safeParse(() => e.grade.name),
        safeParse(() => e.creditType.`type`),
        e.answerLanguage
      )
      createRow(sheet, data, idx + 1)
    }
    (0 to 9).foreach(i => sheet.autoSizeColumn(i, true))

  /** Streams the reservations report. Caller must close the stream. */
  def streamReservationsForRoomByDateAsExcel(
      roomId: Long,
      from: String,
      to: String
  )(os: OutputStream): Unit =
    val enrolments = fetchReservationsForRoomBetween(roomId, from, to)
    excelBuilder.streamTo(os)(wb => buildReservationsSheet(wb, enrolments))

  private def fetchReservationsForRoomBetween(
      roomId: Long,
      from: String,
      to: String
  ): List[ExamEnrolment] =
    val start = DateTime.parse(from, DTF)
    val end   = DateTime.parse(to, DTF)
    DB
      .find(classOf[ExamEnrolment])
      .fetch("user")
      .fetch("exam")
      .where()
      .gt("reservation.endAt", start)
      .lt("reservation.startAt", end)
      .eq("reservation.machine.room.id", roomId)
      .isNotNull("exam")
      .list

  private def buildReservationsSheet(wb: Workbook, enrolments: List[ExamEnrolment]): Unit =
    val sheet = wb.createSheet("reservations")
    val headers = Array(
      "enrolment id",
      "enrolled on",
      "user id",
      "user first name",
      "user last name",
      "exam id",
      "exam name",
      "reservation id",
      "reservation begins",
      "reservation ends",
      "machine id",
      "machine name",
      "machine IP",
      "room id",
      "room name",
      "room code"
    )
    addHeader(sheet, headers)
    enrolments.zipWithIndex.foreach { case (e, idx) =>
      val data = Array(
        e.id.toString,
        ISODateTimeFormat.date().print(new DateTime(e.enrolledOn)),
        e.user.id.toString,
        e.user.firstName,
        e.user.lastName,
        e.exam.id.toString,
        e.exam.name,
        e.reservation.id.toString,
        ISODateTimeFormat.dateTime().print(new DateTime(e.reservation.startAt)),
        ISODateTimeFormat.dateTime().print(new DateTime(e.reservation.endAt)),
        e.reservation.machine.id.toString,
        e.reservation.machine.name,
        e.reservation.machine.ipAddress,
        e.reservation.machine.room.id.toString,
        e.reservation.machine.room.name,
        e.reservation.machine.room.roomCode
      )
      createRow(sheet, data, idx + 1)
    }
    headers.indices.foreach(i => sheet.autoSizeColumn(i, true))

  /** Streams the report to the given output stream using SXSSF (low memory). Caller must close the
    * stream.
    */
  def streamAllExamsAsExcel(from: String, to: String)(os: OutputStream): Unit =
    val start = DateTime.parse(from, DTF)
    val end   = DateTime.parse(to, DTF)

    val participations = DB
      .find(classOf[ExamParticipation])
      .fetch("exam")
      .where()
      .gt("started", start)
      .lt("ended", end)
      .or()
      .eq("exam.state", ExamState.GRADED)
      .eq("exam.state", ExamState.GRADED_LOGGED)
      .eq("exam.state", ExamState.ARCHIVED)
      .endOr()
      .list

    excelBuilder.streamTo(os)(wb =>
      generateParticipationSheet(wb, participations, includeStudentInfo = true)
    )

  /** Returns a stream writer if the student exists; caller must close the stream after writing. */
  def streamStudentActivityAsExcel(
      studentId: Long,
      from: String,
      to: String
  ): Option[OutputStream => Unit] =
    Option(DB.find(classOf[User], studentId)).map { student =>
      val participations = fetchStudentParticipations(studentId, from, to)
      (os: OutputStream) =>
        excelBuilder.streamTo(os)(wb => buildStudentActivitySheets(wb, student, participations))
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
      .fetch("exam")
      .fetch("reservation")
      .fetch("reservation.externalReservation")
      .fetch("reservation.machine")
      .fetch("reservation.machine.room")
      .where()
      .gt("started", start)
      .lt("ended", end)
      .eq("user.id", studentId)
      .isNotNull("reservation")
      .list

  private def buildStudentActivitySheets(
      wb: Workbook,
      student: User,
      participations: List[ExamParticipation]
  ): Unit =
    val studentSheet = wb.createSheet("student")
    addHeader(studentSheet, Array("id", "first name", "last name", "email", "language"))
    val dataRow = studentSheet.createRow(1)
    dataRow.createCell(0).setCellValue(student.id.toDouble)
    dataRow.createCell(1).setCellValue(student.firstName)
    dataRow.createCell(2).setCellValue(student.lastName)
    dataRow.createCell(3).setCellValue(student.email)
    dataRow.createCell(4).setCellValue(student.language.code)
    generateParticipationSheet(wb, participations, includeStudentInfo = false)

  // Helper methods
  private def generateParticipationSheet(
      workbook: Workbook,
      participations: List[ExamParticipation],
      includeStudentInfo: Boolean
  ): Unit =
    val sheet = workbook.createSheet("participations")

    val headers =
      (if includeStudentInfo then
         List("student id", "student first name", "student last name", "student email")
       else List.empty) ++
        List(
          "graded by teacher id",
          "graded by teacher first name",
          "graded by teacher last name",
          "graded by teacher email",
          "reservation id",
          "exam started",
          "exam ended",
          "actual duration",
          "room id",
          "room name",
          "room code",
          "machine id",
          "machine name",
          "machine IP",
          "course name",
          "course code",
          "exam id",
          "exam name",
          "exam duration",
          "exam state",
          "exam score",
          "exam grade scale",
          "exam grade",
          "graded on",
          "credit type"
        )

    addHeader(sheet, headers.toArray)

    participations.zipWithIndex.foreach { case (p, idx) =>
      val studentInfo =
        if includeStudentInfo then
          List(
            p.user.id.toString,
            p.user.firstName,
            p.user.lastName,
            p.user.email
          )
        else List.empty

      val data = studentInfo ++ List(
        Option(p.exam.gradedByUser).map(_.id.toString).getOrElse(""),
        Option(p.exam.gradedByUser).map(_.firstName).getOrElse(""),
        Option(p.exam.gradedByUser).map(_.lastName).getOrElse(""),
        Option(p.exam.gradedByUser).map(_.email).getOrElse(""),
        p.reservation.id.toString,
        ISODateTimeFormat.dateTime().print(new DateTime(p.started)),
        ISODateTimeFormat.dateTime().print(new DateTime(p.ended)),
        ISODateTimeFormat.time().print(new DateTime(p.duration)),
        Option(p.reservation.machine).map(_.room.id.toString).getOrElse("external"),
        Option(p.reservation.machine)
          .map(_.room.name)
          .getOrElse(p.reservation.externalReservation.roomName),
        Option(p.reservation.machine)
          .map(_.room.roomCode)
          .getOrElse(p.reservation.externalReservation.roomCode),
        Option(p.reservation.machine).map(_.id.toString).getOrElse("external"),
        Option(p.reservation.machine)
          .map(_.name)
          .getOrElse(p.reservation.externalReservation.machineName),
        Option(p.reservation.machine).map(_.ipAddress).getOrElse("external"),
        Option(p.exam.course).map(_.name).getOrElse(""),
        Option(p.exam.course).map(_.code).getOrElse(""),
        p.exam.id.toString,
        p.exam.name,
        p.exam.duration.toString,
        p.exam.state.toString,
        p.exam.getTotalScore.toString,
        Option(p.exam.gradeScale)
          .map(_.description)
          .getOrElse(p.exam.course.gradeScale.description),
        Option(p.exam.grade).map(_.name).getOrElse(""),
        Option(p.exam.gradedTime).map(t =>
          ISODateTimeFormat.dateTime().print(new DateTime(t))
        ).getOrElse(""),
        Option(p.exam.creditType).map(_.`type`).getOrElse("")
      )

      createRow(sheet, data.toArray, idx + 1)
    }

    headers.indices.foreach(i => sheet.autoSizeColumn(i, true))

  private def createRow(sheet: Sheet, data: Array[String], rowIndex: Int): Unit =
    val dataRow = sheet.createRow(rowIndex)
    data.zipWithIndex.foreach { case (value, i) =>
      dataRow.createCell(i).setCellValue(value)
    }

  private def safeParse(supplier: () => String): String =
    Try(supplier()).getOrElse {
      logger.warn("Invalid review data. Not able to provide it for report")
      "N/A"
    }

  private def forceNotNull(src: String): String = Option(src).getOrElse("")

  private def addHeader(sheet: Sheet, headers: Array[String]): Unit =
    val headerRow = sheet.createRow(0)
    headers.zipWithIndex.foreach { case (header, i) =>
      headerRow.createCell(i).setCellValue(header)
    }
