// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.controllers

import features.admin.services.StatisticsService
import database.EbeanJsonExtensions
import models.user.Role
import play.api.mvc._
import security.Auth.{AuthenticatedAction, authorized}
import security.AuthExecutionContext

import javax.inject.Inject
import scala.util.{Failure, Success}

class StatisticsController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    private val statisticsService: StatisticsService,
    implicit val ec: AuthExecutionContext
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
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      statisticsService.findExam(id) match
        case None => NotFound
        case Some(exam) =>
          reportType match
            case "xlsx" =>
              statisticsService.examToExcel(exam) match
                case Success(data) =>
                  Ok(data)
                    .as(XLSX_MIME)
                    .withHeaders("Content-Disposition" -> "attachment; filename=\"exams.xlsx\"")
                case Failure(_) => InternalServerError("Failed to create Excel file")
            case "json" =>
              Ok(exam.asJson)
                .as("application/json")
                .withHeaders("Content-Disposition" -> "attachment; filename=\"exams.json\"")
            case _ => BadRequest(s"invalid type: $reportType")
    }

  def getTeacherExamsByDate(uid: Long, from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      statisticsService.getTeacherExamsByDate(uid, from, to) match
        case Success(data) =>
          Ok(data)
            .as(XLSX_MIME)
            .withHeaders("Content-Disposition" -> "attachment; filename=\"teachers_exams.xlsx\"")
        case Failure(_) => InternalServerError("Failed to create Excel file")
    }

  def getExamEnrollments(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      statisticsService.getExamEnrollments(id) match
        case Success(data) =>
          Ok(data)
            .as(XLSX_MIME)
            .withHeaders("Content-Disposition" -> "attachment; filename=\"enrolments.xlsx\"")
        case Failure(_) => NotFound("i18n_error_exam_not_found")
    }

  def getReviewsByDate(from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      statisticsService.getReviewsByDate(from, to) match
        case Success(data) =>
          Ok(data)
            .as(XLSX_MIME)
            .withHeaders("Content-Disposition" -> "attachment; filename=\"reviews.xlsx\"")
        case Failure(_) => InternalServerError("Failed to create Excel file")
    }

  def getReservationsForRoomByDate(roomId: Long, from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      statisticsService.getReservationsForRoomByDate(roomId, from, to) match
        case Success(data) =>
          Ok(data)
            .as(XLSX_MIME)
            .withHeaders("Content-Disposition" -> "attachment; filename=\"reservations.xlsx\"")
        case Failure(_) => InternalServerError("Failed to create Excel file")
    }

  def reportAllExams(from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      statisticsService.reportAllExams(from, to) match
        case Success(data) =>
          Ok(data)
            .as(XLSX_MIME)
            .withHeaders("Content-Disposition" -> "attachment; filename=\"all_exams.xlsx\"")
        case Failure(_) => InternalServerError("Failed to create Excel file")
    }

  def reportStudentActivity(studentId: Long, from: String, to: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      statisticsService.reportStudentActivity(studentId, from, to) match
        case Success((_, data)) =>
          Ok(data)
            .as(XLSX_MIME)
            .withHeaders("Content-Disposition" -> "attachment; filename=\"student_activity.xlsx\"")
        case Failure(_) => NotFound("i18n_error_not_found")
    }
