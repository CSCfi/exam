// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.attachment.controllers

import database.EbeanJsonExtensions
import features.attachment.services.AttachmentService
import models.user.{Permission, Role}
import org.apache.pekko.stream.scaladsl.Source
import org.apache.pekko.stream.{IOResult, Materializer}
import org.apache.pekko.util.ByteString
import play.api.libs.Files.TemporaryFile
import play.api.mvc.*
import play.api.mvc.MultipartFormData.FilePart
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext, PermissionFilter}
import system.AuditedAction
import system.interceptors.AnonymousHandler

import javax.inject.Inject
import scala.concurrent.Future

class AttachmentController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    private val attachmentService: AttachmentService,
    implicit val ec: BlockingIOExecutionContext,
    implicit val mat: Materializer
) extends BaseController
    with EbeanJsonExtensions
    with AnonymousHandler:

  def addAttachmentToQuestionAnswer(): Action[MultipartFormData[TemporaryFile]] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.STUDENT)))
    .async(parse.multipartFormData) { request =>
      parseMultipartForm(request) match
        case None => Future.successful(BadRequest("Invalid form data"))
        case Some((filePart, formData)) =>
          formData.get("questionId").flatMap(_.headOption).map(_.toLong) match
            case None => Future.successful(BadRequest("Missing questionId"))
            case Some(qid) =>
              val user = request.attrs(Auth.ATTR_USER)
              attachmentService.addAttachmentToQuestionAnswer(qid, filePart, user).map {
                case Right(answer)     => Ok(answer.asJson)
                case Left("Forbidden") => Forbidden
                case Left(_)           => InternalServerError("i18n_error_creating_attachment")
              }
    }

  def addAttachmentToQuestion(): Action[MultipartFormData[TemporaryFile]] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .async(parse.multipartFormData) { request =>
      parseMultipartForm(request) match
        case None => Future.successful(BadRequest("Invalid form data"))
        case Some((filePart, formData)) =>
          formData.get("questionId").flatMap(_.headOption).map(_.toLong) match
            case None => Future.successful(BadRequest("Missing questionId"))
            case Some(qid) =>
              attachmentService.addAttachmentToQuestion(qid, filePart).map {
                case Right(question)  => Ok(question.asJson)
                case Left("NotFound") => NotFound
                case Left(_)          => InternalServerError("i18n_error_creating_attachment")
              }
    }

  def deleteQuestionAttachment(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      _ =>
        attachmentService.deleteQuestionAttachment(id) match
          case Right(_) => Ok
          case Left(_)  => NotFound
    }

  def deleteQuestionAnswerAttachment(qid: Long): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT, Role.Name.SUPPORT))
    ).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      attachmentService.deleteQuestionAnswerAttachment(qid, user).map {
        case Right(answer) => Ok(answer.asJson)
        case Left(_)       => NotFound
      }
    }

  def deleteExamAttachment(id: Long): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))
    ).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      attachmentService.deleteExamAttachment(id, user).map {
        case Right(_)                            => Ok
        case Left("i18n_error_access_forbidden") => Forbidden("i18n_error_access_forbidden")
        case Left(_)                             => NotFound
      }
    }

  def deleteFeedbackAttachment(id: Long): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))
    ).async { _ =>
      attachmentService.deleteFeedbackAttachment(id).map {
        case Right(_) => Ok
        case Left(_)  => NotFound("i18n_exam_not_found")
      }
    }

  def deleteStatementAttachment(id: Long): Action[AnyContent] =
    authenticated
      .andThen(PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE))
      .async { _ =>
        attachmentService.deleteStatementAttachment(id).map {
          case Right(_) => Ok
          case Left(_)  => NotFound("i18n_exam_not_found")
        }
      }

  def addAttachmentToExam(): Action[MultipartFormData[TemporaryFile]] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .async(parse.multipartFormData) { request =>
      parseMultipartForm(request) match
        case None => Future.successful(BadRequest("Invalid form data"))
        case Some((filePart, formData)) =>
          formData.get("examId").flatMap(_.headOption).map(_.toLong) match
            case None => Future.successful(BadRequest("Missing examId"))
            case Some(eid) =>
              val user = request.attrs(Auth.ATTR_USER)
              attachmentService.addAttachmentToExam(eid, filePart, user).map {
                case Right(exam)                         => Ok(exam.asJson)
                case Left("i18n_error_access_forbidden") => Forbidden("i18n_error_access_forbidden")
                case Left("NotFound")                    => NotFound
                case Left(_) => InternalServerError("i18n_error_creating_attachment")
              }
    }

  def addFeedbackAttachment(id: Long): Action[MultipartFormData[TemporaryFile]] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .async(parse.multipartFormData) { request =>
      parseMultipartForm(request) match
        case None => Future.successful(BadRequest("Invalid form data"))
        case Some((filePart, _)) =>
          val user = request.attrs(Auth.ATTR_USER)
          attachmentService.addFeedbackAttachment(id, filePart, user).map {
            case Right(comment)   => Ok(comment.asJson)
            case Left("NotFound") => NotFound
            case Left(_)          => InternalServerError("i18n_error_creating_attachment")
          }
    }

  def addStatementAttachment(id: Long): Action[MultipartFormData[TemporaryFile]] = audited
    .andThen(authenticated)
    .andThen(PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE))
    .async(parse.multipartFormData) { request =>
      parseMultipartForm(request) match
        case None => Future.successful(BadRequest("Invalid form data"))
        case Some((filePart, _)) =>
          val user = request.attrs(Auth.ATTR_USER)
          attachmentService.addStatementAttachment(id, filePart, user).map {
            case Right(comment)   => Ok(comment.asJson)
            case Left("NotFound") => NotFound
            case Left(_)          => InternalServerError("i18n_error_creating_attachment")
          }
    }

  def downloadQuestionAttachment(id: Long): Action[AnyContent] =
    authenticated.async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      attachmentService.downloadQuestionAttachment(id, user).flatMap {
        case Right(attachment) =>
          attachmentService.serveAttachment(attachment).flatMap {
            case Right(source) => serveAsBase64Stream(attachment, source)
            case Left(error)   => Future.successful(InternalServerError(error))
          }
        case Left(_) => Future.successful(NotFound)
      }
    }

  def downloadQuestionAnswerAttachment(qid: Long): Action[AnyContent] =
    authenticated.async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      attachmentService.downloadQuestionAnswerAttachment(qid, user).flatMap {
        case Right(attachment) =>
          attachmentService.serveAttachment(attachment).flatMap {
            case Right(source) => serveAsBase64Stream(attachment, source)
            case Left(error)   => Future.successful(InternalServerError(error))
          }
        case Left(_) => Future.successful(NotFound)
      }
    }

  def downloadExamAttachment(id: Long): Action[AnyContent] =
    authenticated.async { _ =>
      attachmentService.downloadExamAttachment(id).flatMap {
        case Right(attachment) =>
          attachmentService.serveAttachment(attachment).flatMap {
            case Right(source) => serveAsBase64Stream(attachment, source)
            case Left(error)   => Future.successful(InternalServerError(error))
          }
        case Left(_) => Future.successful(NotFound)
      }
    }

  def downloadFeedbackAttachment(id: Long): Action[AnyContent] =
    authenticated.async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      attachmentService.downloadFeedbackAttachment(id, user).flatMap {
        case Right(attachment) =>
          attachmentService.serveAttachment(attachment).flatMap {
            case Right(source) => serveAsBase64Stream(attachment, source)
            case Left(error)   => Future.successful(InternalServerError(error))
          }
        case Left(_) => Future.successful(NotFound)
      }
    }

  def downloadStatementAttachment(id: Long): Action[AnyContent] =
    authenticated.async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      attachmentService.downloadStatementAttachment(id, user).flatMap {
        case Right(attachment) =>
          attachmentService.serveAttachment(attachment).flatMap {
            case Right(source) => serveAsBase64Stream(attachment, source)
            case Left(error)   => Future.successful(InternalServerError(error))
          }
        case Left(_) => Future.successful(NotFound)
      }
    }

  private def parseMultipartForm(
      request: Request[MultipartFormData[TemporaryFile]]
  ): Option[(FilePart[TemporaryFile], Map[String, Seq[String]])] =
    request.body.file("file").map { filePart =>
      (filePart, request.body.dataParts)
    }

  private def serveAsBase64Stream(
      attachment: models.attachment.Attachment,
      source: Source[ByteString, Future[IOResult]]
  ): Future[Result] =
    // Convert to base64 and stream
    source
      .map(_.encodeBase64)
      .runFold(ByteString.empty)(_ ++ _)
      .map { base64Data =>
        Ok(base64Data.utf8String)
          .withHeaders(
            "Content-Disposition" -> s"attachment; filename=\"${attachment.getFileName}\"",
            "Content-Type"        -> "application/octet-stream"
          )
      }
