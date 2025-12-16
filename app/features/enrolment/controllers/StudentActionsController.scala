// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.controllers

import features.enrolment.services.{FileResponse, StudentActionsError, StudentActionsService}
import database.EbeanJsonExtensions
import models.user.Role
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.interceptors.SensitiveDataFilter

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class StudentActionsController @Inject() (
    authenticated: AuthenticatedAction,
    private val studentActionsService: StudentActionsService,
    private val sensitiveDataFilter: SensitiveDataFilter,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def getExamFeedback(id: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(sensitiveDataFilter(Set("score", "defaultScore", "correctOption"))) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        studentActionsService.getExamFeedback(id, user) match
          case Some(exam) => Ok(exam.asJson)
          case None       => NotFound(StudentActionsError.ExamNotFound.message)
      }

  def getExamScore(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(sensitiveDataFilter(Set("score", "defaultScore", "correctOption"))) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        studentActionsService.getExamScore(eid, user) match
          case Some(exam) => Ok(asJson(exam))
          case None       => NotFound(StudentActionsError.ExamNotFound.message)
      }

  def getExamScoreReport(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(sensitiveDataFilter(Set("score", "defaultScore", "correctOption"))) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        studentActionsService.getExamScoreReport(eid, user) match
          case Right(fileResponse) =>
            Ok(fileResponse.content)
              .withHeaders("Content-Disposition" -> s"attachment; filename=\"${fileResponse.fileName}\"")
              .as(fileResponse.contentType)
          case Left(StudentActionsError.ExamNotFound) => NotFound(StudentActionsError.ExamNotFound.message)
          case Left(StudentActionsError.ErrorCreatingExcelFile) =>
            InternalServerError(StudentActionsError.ErrorCreatingExcelFile.message)
          case Left(_) => InternalServerError
      }

  def getFinishedExams(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      Ok(studentActionsService.getFinishedExams(filter, user).asJson)
    }

  def getEnrolment(eid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      studentActionsService.getEnrolment(eid, user).map {
        case Right(json) => Ok(json).as("application/json")
        case Left(StudentActionsError.EnrolmentNotFound) =>
          NotFound(StudentActionsError.EnrolmentNotFound.message)
        case Left(StudentActionsError.CollaborativeExamNotFound) =>
          NotFound(StudentActionsError.CollaborativeExamNotFound.message)
        case Left(_) => NotFound
      }
    }

  def getEnrolmentsForUser: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      studentActionsService.getEnrolmentsForUser(user).map(enrolments => Ok(enrolments.asJson))
    }

  def getExamConfigFile(enrolmentId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      studentActionsService.getExamConfigFile(enrolmentId, user) match
        case Right(fileResponse) =>
          Ok(fileResponse.content)
            .withHeaders("Content-Disposition" -> s"attachment; filename=\"${fileResponse.fileName}\"")
            .as(fileResponse.contentType)
        case Left(StudentActionsError.ExamConfigNotAvailable) =>
          Forbidden(StudentActionsError.ExamConfigNotAvailable.message)
        case Left(StudentActionsError.ErrorCreatingConfigFile) =>
          InternalServerError(StudentActionsError.ErrorCreatingConfigFile.message)
        case Left(_) => Forbidden
    }

  def getExamInfo(eid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      studentActionsService.getExamInfo(eid, user) match
        case Some(exam) => Ok(exam.asJson)
        case None       => NotFound(StudentActionsError.ExamNotFound.message)
    }

  def listAvailableExams(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      studentActionsService.listAvailableExams(filter, user).map(json => Ok(json))
    }
