// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.controllers

import features.admin.services.StatisticsService
import database.EbeanJsonExtensions
import models.user.Role
import org.apache.pekko.stream.scaladsl.StreamConverters
import play.api.mvc._
import security.Auth.{AuthenticatedAction, authorized}
import security.BlockingIOExecutionContext

import java.io.{PipedInputStream, PipedOutputStream}
import javax.inject.Inject
import scala.concurrent.Future

class StatisticsController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    private val statisticsService: StatisticsService,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private val XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  def getStudents: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Ok(statisticsService.getStudents.asJson)
    }

  def getExamNames: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Ok(statisticsService.getExamNames.asJson)
    }

  def getExam(id: Long, reportType: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      statisticsService.findExam(id) match
        case None => Future.successful(NotFound)
        case Some(exam) =>
          reportType match
            case "xlsx" =>
              val pos = new PipedOutputStream()
              val pis = new PipedInputStream(pos)
              Future {
                try statisticsService.streamExamAsExcel(exam)(pos)
                finally pos.close()
              }(using ec)
              Future.successful(
                Ok.chunked(StreamConverters.fromInputStream(() => pis))
                  .as(XLSX_MIME)
                  .withHeaders("Content-Disposition" -> "attachment; filename=\"exams.xlsx\"")
              )
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
      val pos = new PipedOutputStream()
      val pis = new PipedInputStream(pos)
      Future {
        try statisticsService.streamTeacherExamsByDateAsExcel(uid, from, to)(pos)
        finally pos.close()
      }(using ec)
      Future.successful(
        Ok.chunked(StreamConverters.fromInputStream(() => pis))
          .as(XLSX_MIME)
          .withHeaders("Content-Disposition" -> "attachment; filename=\"teachers_exams.xlsx\"")
      )
    }

  def getExamEnrollments(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      statisticsService.streamExamEnrolmentsAsExcel(id) match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(write) =>
          val pos = new PipedOutputStream()
          val pis = new PipedInputStream(pos)
          Future {
            try write(pos)
            finally pos.close()
          }(using ec)
          Future.successful(
            Ok.chunked(StreamConverters.fromInputStream(() => pis))
              .as(XLSX_MIME)
              .withHeaders("Content-Disposition" -> "attachment; filename=\"enrolments.xlsx\"")
          )
    }

  def getReviewsByDate(from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      val pos = new PipedOutputStream()
      val pis = new PipedInputStream(pos)
      Future {
        try statisticsService.streamReviewsByDateAsExcel(from, to)(pos)
        finally pos.close()
      }(using ec)
      Future.successful(
        Ok.chunked(StreamConverters.fromInputStream(() => pis))
          .as(XLSX_MIME)
          .withHeaders("Content-Disposition" -> "attachment; filename=\"reviews.xlsx\"")
      )
    }

  def getReservationsForRoomByDate(roomId: Long, from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      val pos = new PipedOutputStream()
      val pis = new PipedInputStream(pos)
      Future {
        try statisticsService.streamReservationsForRoomByDateAsExcel(roomId, from, to)(pos)
        finally pos.close()
      }(using ec)
      Future.successful(
        Ok.chunked(StreamConverters.fromInputStream(() => pis))
          .as(XLSX_MIME)
          .withHeaders("Content-Disposition" -> "attachment; filename=\"reservations.xlsx\"")
      )
    }

  def reportAllExams(from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      val pos = new PipedOutputStream()
      val pis = new PipedInputStream(pos)
      Future {
        try statisticsService.streamAllExamsAsExcel(from, to)(pos)
        finally pos.close()
      }(using ec)
      Future.successful(
        Ok.chunked(StreamConverters.fromInputStream(() => pis))
          .as(XLSX_MIME)
          .withHeaders("Content-Disposition" -> "attachment; filename=\"all_exams.xlsx\"")
      )
    }

  def reportStudentActivity(studentId: Long, from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      statisticsService.streamStudentActivityAsExcel(studentId, from, to) match
        case None => Future.successful(NotFound("i18n_error_not_found"))
        case Some(writer) =>
          val pos = new PipedOutputStream()
          val pis = new PipedInputStream(pos)
          Future {
            try writer(pos)
            finally pos.close()
          }(using ec)
          Future.successful(
            Ok.chunked(StreamConverters.fromInputStream(() => pis))
              .as(XLSX_MIME)
              .withHeaders(
                "Content-Disposition" -> "attachment; filename=\"student_activity.xlsx\""
              )
          )
    }
