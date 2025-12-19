// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.controllers

import features.assessment.services.{ExamRecordError, ExamRecordService}
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import validation.CommaJoinedListValidator
import validation.core.{ScalaAttrs, Validators}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ExamRecordController @Inject() (
    val controllerComponents: ControllerComponents,
    val validators: Validators,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    private val examRecordService: ExamRecordService,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private val XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  def addExamRecord(): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
      .andThen(audited)(parse.json) { request =>
        (request.body \ "id").asOpt[Long] match
          case Some(id) =>
            val user = request.attrs(Auth.ATTR_USER)
            examRecordService.addExamRecord(id, user) match
              case Right(_) => Ok
              case Left(ExamRecordError.ExamNotFound) | Left(
                    ExamRecordError.ParticipationNotFound
                  ) => NotFound
              case Left(ExamRecordError.AccessForbidden) =>
                Forbidden(ExamRecordError.AccessForbidden.message)
              case Left(ExamRecordError.NotYetGraded) =>
                Forbidden(ExamRecordError.NotYetGraded.message)
              case Left(ExamRecordError.AlreadyGradedLogged) =>
                Forbidden(ExamRecordError.AlreadyGradedLogged.message)
              case Left(_) => Forbidden
          case None => BadRequest
      }

  def registerExamWithoutRecord(): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
      .andThen(audited)(parse.json) { request =>
        (request.body \ "id").asOpt[Long] match
          case Some(id) =>
            val user = request.attrs(Auth.ATTR_USER)
            examRecordService.registerExamWithoutRecord(id, user) match
              case Right(_) => Ok
              case Left(ExamRecordError.ExamNotFound) =>
                NotFound(ExamRecordError.ExamNotFound.message)
              case Left(ExamRecordError.AccessForbidden) =>
                Forbidden(ExamRecordError.AccessForbidden.message)
              case Left(ExamRecordError.NotYetGraded) =>
                Forbidden(ExamRecordError.NotYetGraded.message)
              case Left(ExamRecordError.AlreadyGradedLogged) =>
                Forbidden(ExamRecordError.AlreadyGradedLogged.message)
              case Left(_) => Forbidden
          case None => BadRequest
      }

  def exportExamRecordsAsCsv(start: Long, end: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT))) {
      _ =>
        examRecordService.exportExamRecordsAsCsv(start, end) match
          case Right((content, contentDisposition)) =>
            Ok(content).withHeaders("Content-Disposition" -> contentDisposition)
          case Left(ExamRecordError.ErrorCreatingCsvFile) =>
            InternalServerError(ExamRecordError.ErrorCreatingCsvFile.message)
          case Left(_) => InternalServerError
    }

  def exportSelectedExamRecordsAsCsv(examId: Long): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
    .andThen(validators.validated(CommaJoinedListValidator)) { request =>
      val ids = request.attrs(ScalaAttrs.ID_LIST)
      examRecordService.exportSelectedExamRecordsAsCsv(examId, ids) match
        case Right((content, contentDisposition)) =>
          Ok(content).withHeaders("Content-Disposition" -> contentDisposition)
        case Left(ExamRecordError.ErrorCreatingCsvFile) =>
          InternalServerError(ExamRecordError.ErrorCreatingCsvFile.message)
        case Left(_) => InternalServerError
    }

  def exportSelectedExamRecordsAsExcel(examId: Long): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
    .andThen(validators.validated(CommaJoinedListValidator)) { request =>
      val ids = request.attrs(ScalaAttrs.ID_LIST)
      examRecordService.exportSelectedExamRecordsAsExcel(examId, ids) match
        case Right(content) =>
          Ok(content)
            .withHeaders("Content-Disposition" -> "attachment; filename=\"exam_records.xlsx\"")
            .as(XLSX_MIME)
        case Left(ExamRecordError.ErrorCreatingExcelFile) =>
          InternalServerError(ExamRecordError.ErrorCreatingExcelFile.message)
        case Left(_) => InternalServerError
    }
