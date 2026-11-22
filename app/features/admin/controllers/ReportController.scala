// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.controllers

import database.EbeanJsonExtensions
import features.admin.services.ReportService
import models.user.Role
import org.apache.pekko.stream.scaladsl.StreamConverters
import play.api.Logging
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.BlockingIOExecutionContext

import java.io.{OutputStream, PipedInputStream, PipedOutputStream}
import javax.inject.Inject
import scala.concurrent.Future
import scala.util.control.NonFatal

class ReportController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    private val reportService: ReportService,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions
    with Logging:

  private val XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  /** Streams the workbook as it is written. The response has started by the time writing fails, so
    * the download is cut short and the log is the only trace of the error.
    */
  private def excel(filename: String)(write: OutputStream => Unit): Result =
    val pos = new PipedOutputStream()
    val pis = new PipedInputStream(pos)
    Future {
      try write(pos)
      catch case NonFatal(e) => logger.error(s"Failed to write report $filename", e)
      finally pos.close()
    }(using ec)
    Ok.chunked(StreamConverters.fromInputStream(() => pis))
      .as(XLSX_MIME)
      .withHeaders("Content-Disposition" -> s"attachment; filename=\"$filename\"")

  def getStudents: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Ok(reportService.getStudents.asJsonText).as(JSON)
    }

  def getExamNames: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Ok(reportService.examNames.asJsonText).as(JSON)
    }

  def getExam(id: Long, reportType: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      reportService.findExam(id) match
        case None => Future.successful(NotFound)
        case Some(exam) =>
          reportType match
            case "xlsx" =>
              Future.successful(excel("exams.xlsx")(reportService.streamExamAsExcel(exam)))
            case "json" =>
              Future.successful(
                Ok(exam.asJson)
                  .as("application/json")
                  .withHeaders("Content-Disposition" -> "attachment; filename=\"exams.json\"")
              )
            case _ => Future.successful(BadRequest(s"invalid type: $reportType"))
    }

  def getTeacherExamsByDate(uid: Long, from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      Future.successful(excel("teachers_exams.xlsx")(reportService.streamTeacherExamsByDateAsExcel(
        uid,
        from,
        to
      )))
    }

  def getExamEnrolments(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      reportService.streamExamEnrolmentsAsExcel(id) match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(write) =>
          Future.successful(excel("enrolments.xlsx")(write))
    }

  def getReviewsByDate(from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      Future.successful(excel("reviews.xlsx")(reportService.streamReviewsByDateAsExcel(from, to)))
    }

  def getReservationsForRoomByDate(roomId: Long, from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      Future.successful(excel("reservations.xlsx")(
        reportService.streamReservationsForRoomByDateAsExcel(roomId, from, to)
      ))
    }

  def reportAllExams(from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      Future.successful(excel("all_exams.xlsx")(reportService.streamAllExamsAsExcel(from, to)))
    }

  def reportStudentActivity(studentId: Long, from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      reportService.streamStudentActivityAsExcel(studentId, from, to) match
        case None => Future.successful(NotFound("i18n_error_not_found"))
        case Some(writer) =>
          Future.successful(excel("student_activity.xlsx")(writer))
    }
