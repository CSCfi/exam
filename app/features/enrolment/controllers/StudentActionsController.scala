// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.controllers

import database.EbeanJsonExtensions
import features.enrolment.services.{StudentActionsError, StudentActionsService}
import models.user.Role
import org.apache.pekko.stream.scaladsl.StreamConverters
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import system.interceptors.SensitiveDataFilter

import java.io.{PipedInputStream, PipedOutputStream}
import javax.inject.Inject
import scala.concurrent.Future

class StudentActionsController @Inject() (
    authenticated: AuthenticatedAction,
    private val studentActionsService: StudentActionsService,
    private val sensitiveDataFilter: SensitiveDataFilter,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
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

  private val XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  def getExamScoreReport(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(sensitiveDataFilter(Set("score", "defaultScore", "correctOption")))
      .async { request =>
        val user = request.attrs(Auth.ATTR_USER)
        studentActionsService.streamExamScoreReport(eid, user) match
          case Left(StudentActionsError.ExamNotFound) =>
            Future.successful(NotFound(StudentActionsError.ExamNotFound.message))
          case Right(writer) =>
            val pos = new PipedOutputStream()
            val pis = new PipedInputStream(pos)
            Future {
              try writer(pos)
              finally pos.close()
            }(using ec)
            Future.successful(
              Ok.chunked(StreamConverters.fromInputStream(() => pis))
                .as(XLSX_MIME)
                .withHeaders("Content-Disposition" -> "attachment; filename=\"exam_records.xlsx\"")
            )
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
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .async { request =>
        val user = request.attrs(Auth.ATTR_USER)
        studentActionsService.streamExamConfigFile(enrolmentId, user) match
          case Left(StudentActionsError.ExamConfigNotAvailable) =>
            Future.successful(Forbidden(StudentActionsError.ExamConfigNotAvailable.message))
          case Left(StudentActionsError.ErrorCreatingConfigFile) =>
            Future.successful(
              InternalServerError(StudentActionsError.ErrorCreatingConfigFile.message)
            )
          case Left(_) => Future.successful(Forbidden)
          case Right((writer, fileName)) =>
            val pos = new PipedOutputStream()
            val pis = new PipedInputStream(pos)
            Future {
              try writer(pos)
              finally pos.close()
            }(using ec)
            Future.successful(
              Ok.chunked(StreamConverters.fromInputStream(() => pis))
                .as("application/octet-stream")
                .withHeaders("Content-Disposition" -> s"attachment; filename=\"$fileName\"")
            )
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
