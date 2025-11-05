// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.admin

import controllers.base.scala.ExamBaseController
import io.ebean.DB
import miscellaneous.scala.DbApiHelper
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.Exam
import models.user.{Role, User}
import org.apache.poi.ss.usermodel.{Sheet, Workbook}
import org.apache.poi.xssf.usermodel.XSSFWorkbook
import org.joda.time.DateTime
import org.joda.time.format.{DateTimeFormat, ISODateTimeFormat}
import play.api.Logging
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.AuthExecutionContext

import java.io.ByteArrayOutputStream
import java.util.Base64
import javax.inject.Inject
import scala.jdk.CollectionConverters.*
import scala.util.{Try, Using}

class StatisticsController @Inject()(
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with ExamBaseController
    with DbApiHelper
    with Logging:

  private val DTF       = DateTimeFormat.forPattern("dd.MM.yyyy")
  private val XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  def getStudents: Action[AnyContent] = authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
    val students = DB
      .find(classOf[User])
      .select("id, firstName, lastName")
      .where()
      .eq("roles.name", "STUDENT")
      .list
    Ok(students.asJson)
  }

  def getExamNames: Action[AnyContent] = authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
    val exams = DB
      .find(classOf[Exam])
      .select("id, name")
      .fetch("course", "id, name, code")
      .where()
      .isNotNull("name")
      .isNotNull("course")
      .isNull("parent") // only Exam prototypes
      .list
    Ok(exams.asJson)
  }

  def getExam(id: Long, reportType: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      DB.find(classOf[Exam]).where().idEq(id).isNotNull("course").find match
        case None => NotFound
        case Some(exam) =>
          reportType match
            case "xlsx" => examToExcel(exam)
            case "json" => examToJson(exam)
            case _      => BadRequest(s"invalid type: $reportType")
    }

  def getTeacherExamsByDate(uid: Long, from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val start = DateTime.parse(from, DTF)
      val end   = DateTime.parse(to, DTF)

      val exams = DB
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

      Using(new XSSFWorkbook()) { wb =>
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
          val (inReview, graded, logged) = parent.getChildren.asScala.foldLeft((0, 0, 0)) { case ((ir, g, l), child) =>
            child.getState match
              case Exam.State.REVIEW | Exam.State.REVIEW_STARTED => (ir + 1, g, l)
              case Exam.State.GRADED                             => (ir, g + 1, l)
              case Exam.State.GRADED_LOGGED                      => (ir, g, l + 1)
              case _                                             => (ir, g, l)
          }

          val data = Array(
            parent.getName,
            ISODateTimeFormat.date().print(new DateTime(parent.getCreated)),
            parent.getState.toString,
            parent.getCourse.getCode,
            s"${ISODateTimeFormat.date().print(new DateTime(parent.getPeriodStart))} - ${ISODateTimeFormat.date().print(new DateTime(parent.getPeriodEnd))}",
            Option(parent.getCourse.getCredits).map(_.toString).getOrElse(""),
            parent.getExamType.getType,
            inReview.toString,
            graded.toString,
            logged.toString
          )
          createRow(sheet, data, idx + 1)
        }

        (0 to 9).foreach(i => sheet.autoSizeColumn(i, true))
        Ok(encode(wb))
          .as(XLSX_MIME)
          .withHeaders("Content-Disposition" -> "attachment; filename=\"teachers_exams.xlsx\"")
      }.getOrElse(InternalServerError("Failed to create Excel file"))
    }

  def getExamEnrollments(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      DB.find(classOf[Exam])
        .fetch("examEnrolments")
        .fetch("examEnrolments.user")
        .fetch("examEnrolments.reservation")
        .fetch("course")
        .where()
        .eq("id", id)
        .isNull("parent")
        .find match
        case None => NotFound("i18n_error_exam_not_found")
        case Some(proto) =>
          Using(new XSSFWorkbook()) { wb =>
            val sheet = wb.createSheet("enrolments")
            addHeader(sheet, Array("student name", "student ID", "student EPPN", "reservation time", "enrolment time"))

            proto.getExamEnrolments.asScala.zipWithIndex.foreach { case (e, idx) =>
              val data = Array(
                s"${e.getUser.getFirstName} ${e.getUser.getLastName}",
                forceNotNull(e.getUser.getIdentifier),
                e.getUser.getEppn,
                Option(e.getReservation)
                  .map(r => ISODateTimeFormat.dateTimeNoMillis().print(new DateTime(r.getStartAt)))
                  .getOrElse(""),
                ISODateTimeFormat.dateTimeNoMillis().print(new DateTime(e.getEnrolledOn))
              )
              createRow(sheet, data, idx + 1)
            }

            (0 to 4).foreach(i => sheet.autoSizeColumn(i, true))
            Ok(encode(wb))
              .as(XLSX_MIME)
              .withHeaders("Content-Disposition" -> "attachment; filename=\"enrolments.xlsx\"")
          }.getOrElse(InternalServerError("Failed to create Excel file"))
    }

  def getReviewsByDate(from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val start = DateTime.parse(from, DTF)
      val end   = DateTime.parse(to, DTF)

      val exams = DB
        .find(classOf[Exam])
        .fetch("course")
        .where()
        .between("gradedTime", start, end)
        .disjunction()
        .eq("state", Exam.State.GRADED)
        .eq("state", Exam.State.GRADED_LOGGED)
        .endJunction()
        .orderBy("creator.id")
        .list

      Using(new XSSFWorkbook()) { wb =>
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
            s"${e.getCreator.getFirstName} ${e.getCreator.getLastName}",
            e.getName,
            e.getCourse.getCode,
            ISODateTimeFormat.dateTimeNoMillis().print(new DateTime(e.getCreated)),
            ISODateTimeFormat.dateTimeNoMillis().print(new DateTime(e.getGradedTime)),
            safeParse(() => s"${e.getGradedByUser.getFirstName} ${e.getGradedByUser.getLastName}"),
            Option(e.getCourse.getCredits).map(_.toString).getOrElse(""),
            safeParse(() => e.getGrade.getName),
            safeParse(() => e.getCreditType.getType),
            e.getAnswerLanguage
          )
          createRow(sheet, data, idx + 1)
        }

        (0 to 9).foreach(i => sheet.autoSizeColumn(i, true))
        Ok(encode(wb))
          .as(XLSX_MIME)
          .withHeaders("Content-Disposition" -> "attachment; filename=\"reviews.xlsx\"")
      }.getOrElse(InternalServerError("Failed to create Excel file"))
    }

  def getReservationsForRoomByDate(roomId: Long, from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val start = DateTime.parse(from, DTF)
      val end   = DateTime.parse(to, DTF)

      val enrolments = DB
        .find(classOf[ExamEnrolment])
        .fetch("user")
        .fetch("exam")
        .where()
        .gt("reservation.endAt", start)
        .lt("reservation.startAt", end)
        .eq("reservation.machine.room.id", roomId)
        .isNotNull("exam")
        .list

      Using(new XSSFWorkbook()) { wb =>
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
            e.getId.toString,
            ISODateTimeFormat.date().print(new DateTime(e.getEnrolledOn)),
            e.getUser.getId.toString,
            e.getUser.getFirstName,
            e.getUser.getLastName,
            e.getExam.getId.toString,
            e.getExam.getName,
            e.getReservation.getId.toString,
            ISODateTimeFormat.dateTime().print(new DateTime(e.getReservation.getStartAt)),
            ISODateTimeFormat.dateTime().print(new DateTime(e.getReservation.getEndAt)),
            e.getReservation.getMachine.getId.toString,
            e.getReservation.getMachine.getName,
            e.getReservation.getMachine.getIpAddress,
            e.getReservation.getMachine.getRoom.getId.toString,
            e.getReservation.getMachine.getRoom.getName,
            e.getReservation.getMachine.getRoom.getRoomCode
          )
          createRow(sheet, data, idx + 1)
        }

        headers.indices.foreach(i => sheet.autoSizeColumn(i, true))
        Ok(encode(wb))
          .as(XLSX_MIME)
          .withHeaders("Content-Disposition" -> "attachment; filename=\"reservations.xlsx\"")
      }.getOrElse(InternalServerError("Failed to create Excel file"))
    }

  def reportAllExams(from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val start = DateTime.parse(from, DTF)
      val end   = DateTime.parse(to, DTF)

      val participations = DB
        .find(classOf[ExamParticipation])
        .fetch("exam")
        .where()
        .gt("started", start)
        .lt("ended", end)
        .or()
        .eq("exam.state", Exam.State.GRADED)
        .eq("exam.state", Exam.State.GRADED_LOGGED)
        .eq("exam.state", Exam.State.ARCHIVED)
        .endOr()
        .list

      Using(new XSSFWorkbook()) { wb =>
        generateParticipationSheet(wb, participations, includeStudentInfo = true)
        Ok(encode(wb))
          .as(XLSX_MIME)
          .withHeaders("Content-Disposition" -> "attachment; filename=\"all_exams.xlsx\"")
      }.getOrElse(InternalServerError("Failed to create Excel file"))
    }

  def reportStudentActivity(studentId: Long, from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Option(DB.find(classOf[User], studentId)) match
        case None => NotFound("i18n_error_not_found")
        case Some(student) =>
          val start = DateTime.parse(from, DTF)
          val end   = DateTime.parse(to, DTF)

          Using(new XSSFWorkbook()) { wb =>
            // Student info sheet
            val studentSheet = wb.createSheet("student")
            addHeader(studentSheet, Array("id", "first name", "last name", "email", "language"))
            val dataRow = studentSheet.createRow(1)
            dataRow.createCell(0).setCellValue(student.getId.toDouble)
            dataRow.createCell(1).setCellValue(student.getFirstName)
            dataRow.createCell(2).setCellValue(student.getLastName)
            dataRow.createCell(3).setCellValue(student.getEmail)
            dataRow.createCell(4).setCellValue(student.getLanguage.getCode)

            // Participations
            val participations = DB
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

            generateParticipationSheet(wb, participations, includeStudentInfo = false)
            Ok(encode(wb))
              .as(XLSX_MIME)
              .withHeaders("Content-Disposition" -> "attachment; filename=\"student_activity.xlsx\"")
          }.getOrElse(InternalServerError("Failed to create Excel file"))
    }

  // Helper methods
  private def examToExcel(exam: Exam): Result =
    val values = Map(
      "Creator ID"       -> exam.getCreator.getId.toString,
      "First name"       -> exam.getCreator.getFirstName,
      "Last name"        -> exam.getCreator.getLastName,
      "Exam type"        -> exam.getExamType.getType,
      "Course code"      -> exam.getCourse.getCode,
      "Course name"      -> exam.getCourse.getName,
      "Course credits"   -> exam.getCourse.getCredits.toString,
      "Course unit type" -> forceNotNull(exam.getCourse.getCourseUnitType),
      "Course level"     -> forceNotNull(exam.getCourse.getLevel),
      "Created"          -> ISODateTimeFormat.date().print(new DateTime(exam.getCreated)),
      "Begins"           -> ISODateTimeFormat.date().print(new DateTime(exam.getPeriodStart)),
      "Ends"             -> ISODateTimeFormat.date().print(new DateTime(exam.getPeriodEnd)),
      "Duration"         -> Option(exam.getDuration).map(_.toString).getOrElse("N/A"),
      "Grade scale"      -> Option(exam.getGradeScale).map(_.getDescription).getOrElse("N/A"),
      "State"            -> exam.getState.toString,
      "Attachment"       -> Option(exam.getAttachment).map(a => s"${a.getFilePath}${a.getFileName}").getOrElse(""),
      "Instructions"     -> forceNotNull(exam.getInstruction),
      "Shared"           -> exam.isShared.toString
    )

    Using(new XSSFWorkbook()) { wb =>
      val sheet     = wb.createSheet(exam.getName)
      val headerRow = sheet.createRow(0)
      values.keys.zipWithIndex.foreach { case (key, i) =>
        headerRow.createCell(i).setCellValue(key)
      }
      val dataRow = sheet.createRow(1)
      values.values.zipWithIndex.foreach { case (value, i) =>
        dataRow.createCell(i).setCellValue(value)
      }
      Ok(encode(wb))
        .as(XLSX_MIME)
        .withHeaders("Content-Disposition" -> "attachment; filename=\"exams.xlsx\"")
    }.getOrElse(InternalServerError("Failed to create Excel file"))

  private def examToJson(exam: Exam): Result =
    Ok(exam.asJson)
      .as("application/json")
      .withHeaders("Content-Disposition" -> "attachment; filename=\"exams.json\"")

  private def generateParticipationSheet(
      workbook: Workbook,
      participations: List[ExamParticipation],
      includeStudentInfo: Boolean
  ): Unit =
    val sheet = workbook.createSheet("participations")

    val headers =
      (if includeStudentInfo then List("student id", "student first name", "student last name", "student email")
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
            p.getUser.getId.toString,
            p.getUser.getFirstName,
            p.getUser.getLastName,
            p.getUser.getEmail
          )
        else List.empty

      val data = studentInfo ++ List(
        Option(p.getExam.getGradedByUser).map(_.getId.toString).getOrElse(""),
        Option(p.getExam.getGradedByUser).map(_.getFirstName).getOrElse(""),
        Option(p.getExam.getGradedByUser).map(_.getLastName).getOrElse(""),
        Option(p.getExam.getGradedByUser).map(_.getEmail).getOrElse(""),
        p.getReservation.getId.toString,
        ISODateTimeFormat.dateTime().print(new DateTime(p.getStarted)),
        ISODateTimeFormat.dateTime().print(new DateTime(p.getEnded)),
        ISODateTimeFormat.time().print(new DateTime(p.getDuration)),
        Option(p.getReservation.getMachine).map(_.getRoom.getId.toString).getOrElse("external"),
        Option(p.getReservation.getMachine)
          .map(_.getRoom.getName)
          .getOrElse(p.getReservation.getExternalReservation.getRoomName),
        Option(p.getReservation.getMachine)
          .map(_.getRoom.getRoomCode)
          .getOrElse(p.getReservation.getExternalReservation.getRoomCode),
        Option(p.getReservation.getMachine).map(_.getId.toString).getOrElse("external"),
        Option(p.getReservation.getMachine)
          .map(_.getName)
          .getOrElse(p.getReservation.getExternalReservation.getMachineName),
        Option(p.getReservation.getMachine).map(_.getIpAddress).getOrElse("external"),
        Option(p.getExam.getCourse).map(_.getName).getOrElse(""),
        Option(p.getExam.getCourse).map(_.getCode).getOrElse(""),
        p.getExam.getId.toString,
        p.getExam.getName,
        p.getExam.getDuration.toString,
        p.getExam.getState.toString,
        p.getExam.getTotalScore.toString,
        Option(p.getExam.getGradeScale)
          .map(_.getDescription)
          .getOrElse(p.getExam.getCourse.getGradeScale.getDescription),
        Option(p.getExam.getGrade).map(_.getName).getOrElse(""),
        Option(p.getExam.getGradedTime).map(t => ISODateTimeFormat.dateTime().print(new DateTime(t))).getOrElse(""),
        Option(p.getExam.getCreditType).map(_.getType).getOrElse("")
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

  private def encode(wb: Workbook): String =
    Using(new ByteArrayOutputStream()) { bos =>
      wb.write(bos)
      Base64.getEncoder.encodeToString(bos.toByteArray)
    }.get

  private def addHeader(sheet: Sheet, headers: Array[String]): Unit =
    val headerRow = sheet.createRow(0)
    headers.zipWithIndex.foreach { case (header, i) => headerRow.createCell(i).setCellValue(header) }
