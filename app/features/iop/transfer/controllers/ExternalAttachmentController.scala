// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.controllers

import features.iop.transfer.services.{
  DownloadResponse,
  ExternalAttachmentError,
  ExternalAttachmentService
}
import models.user.Role
import play.api.libs.Files.TemporaryFile
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

class ExternalAttachmentController @Inject() (
    private val externalAttachmentService: ExternalAttachmentService,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController:

  private def toDownloadResult(response: DownloadResponse): Result =
    response match
      case DownloadResponse.NotFound            => NotFound
      case DownloadResponse.InternalServerError => InternalServerError
      case DownloadResponse.Error(status)       => Status(status)
      case DownloadResponse.Success(stream, contentType, headers) =>
        Ok.chunked(stream).as(contentType).withHeaders(headers.toSeq*)

  private def toResult[T](result: Either[ExternalAttachmentError, T])(onSuccess: T => Result)
      : Result =
    result match
      case Right(value)                                          => onSuccess(value)
      case Left(ExternalAttachmentError.ExternalExamNotFound)    => Results.NotFound
      case Left(ExternalAttachmentError.ExamNotFound)            => Results.NotFound
      case Left(ExternalAttachmentError.AttachmentNotFound)      => Results.NotFound
      case Left(ExternalAttachmentError.SectionQuestionNotFound) => Results.NotFound
      case Left(ExternalAttachmentError.QuestionAnswerNotFound)  => Results.NotFound
      case Left(ExternalAttachmentError.CouldNotDeserializeExam) =>
        Results.InternalServerError("Could not deserialize exam")
      case Left(ExternalAttachmentError.MissingFile) => Results.BadRequest("Missing file")
      case Left(ExternalAttachmentError.MissingExamIdOrQuestionId) =>
        Results.BadRequest("Missing examId or questionId")
      case Left(ExternalAttachmentError.ExternalIdNotFound) => Results.NotFound

  def downloadExamAttachment(hash: String): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.STUDENT))
    ).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      externalAttachmentService.downloadExamAttachment(hash, user).map {
        case Right(downloadResponse) => toDownloadResult(downloadResponse)
        case Left(error) =>
          toResult(Left(error): Either[ExternalAttachmentError, Unit])(_ => NotFound)
      }
    }

  def downloadQuestionAttachment(hash: String, qid: Long): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.STUDENT))
    ).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      externalAttachmentService.downloadQuestionAttachment(hash, qid, user).map {
        case Right(downloadResponse) => toDownloadResult(downloadResponse)
        case Left(error) =>
          toResult(Left(error): Either[ExternalAttachmentError, Unit])(_ => NotFound)
      }
    }

  def addAttachmentToQuestionAnswer(): Action[MultipartFormData[TemporaryFile]] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))).async(
      parse.multipartFormData
    ) {
      request =>
        val user          = request.attrs(Auth.ATTR_USER)
        val formData      = request.body.asFormUrlEncoded
        val examHashOpt   = formData.get("examId").flatMap(_.headOption)
        val questionIdOpt = formData.get("questionId").flatMap(_.headOption)

        (examHashOpt, questionIdOpt) match
          case (Some(examHash), Some(questionIdStr)) =>
            val questionId = questionIdStr.toLong
            val filePart   = request.body.file("file")
            externalAttachmentService
              .addAttachmentToQuestionAnswer(examHash, questionId, filePart, user)
              .map {
                case Right((json, _)) => Results.Created(json)
                case Left(error) =>
                  toResult(Left(error): Either[ExternalAttachmentError, Result])(identity)
              }
          case _ => Future.successful(Results.BadRequest("Missing examId or questionId"))
    }

  def deleteQuestionAnswerAttachment(qid: Long, hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      externalAttachmentService.deleteQuestionAnswerAttachment(hash, qid, user).map {
        case Right(_) => Results.Ok
        case Left(error) =>
          toResult(Left(error): Either[ExternalAttachmentError, Result])(identity)
      }
    }

  def downloadQuestionAnswerAttachment(qid: Long, hash: String): Action[AnyContent] =
    Action { _ => Results.NotAcceptable }
