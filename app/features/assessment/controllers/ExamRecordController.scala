// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.controllers

import database.EbeanJsonExtensions
import features.assessment.services.{ExamRecordError, ExamRecordService}
import models.user.Role
import org.apache.pekko.stream.scaladsl.StreamConverters
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import system.AuditedAction
import validation.CommaJoinedListValidator
import validation.core.{ScalaAttrs, Validators}

import java.io.{PipedInputStream, PipedOutputStream}
import javax.inject.Inject
import scala.concurrent.Future

class ExamRecordController @Inject() (
    val controllerComponents: ControllerComponents,
    val validators: Validators,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    private val examRecordService: ExamRecordService,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private val XLSX_MIME  = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  private val CSV_MIME   = "text/csv"
  private val CSV_HEADER = "Content-Disposition" -> "attachment; filename=\"examrecords.csv\""

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
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
      .async { _ =>
        val pos = new PipedOutputStream()
        val pis = new PipedInputStream(pos)
        Future {
          try examRecordService.streamExamRecordsAsCsvByDate(start, end)(pos)
          finally pos.close()
        }(using ec)
        Future.successful(
          Ok.chunked(StreamConverters.fromInputStream(() => pis))
            .as(CSV_MIME)
            .withHeaders(CSV_HEADER)
        )
      }

  def exportSelectedExamRecordsAsCsv(examId: Long): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
    .andThen(validators.validated(CommaJoinedListValidator))
    .async { request =>
      val ids = request.attrs(ScalaAttrs.ID_LIST)
      val pos = new PipedOutputStream()
      val pis = new PipedInputStream(pos)
      Future {
        try examRecordService.streamSelectedExamRecordsAsCsv(examId, ids)(pos)
        finally pos.close()
      }(using ec)
      Future.successful(
        Ok.chunked(StreamConverters.fromInputStream(() => pis))
          .as(CSV_MIME)
          .withHeaders("Content-Disposition" -> "attachment; filename=\"exam_records.csv\"")
      )
    }

  def exportSelectedExamRecordsAsExcel(examId: Long): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
    .andThen(validators.validated(CommaJoinedListValidator))
    .async { request =>
      val ids = request.attrs(ScalaAttrs.ID_LIST)
      val pos = new PipedOutputStream()
      val pis = new PipedInputStream(pos)
      Future {
        try examRecordService.streamSelectedExamRecordsAsExcel(examId, ids)(pos)
        finally pos.close()
      }(using ec)
      Future.successful(
        Ok.chunked(StreamConverters.fromInputStream(() => pis))
          .as(XLSX_MIME)
          .withHeaders("Content-Disposition" -> "attachment; filename=\"exam_records.xlsx\"")
      )
    }
