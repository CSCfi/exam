// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.controllers

import features.iop.transfer.services.{DataTransferError, DataTransferService}
import models.user.Role
import play.api.libs.Files.TemporaryFile
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import system.AuditedAction

import javax.inject.Inject

class DataTransferController @Inject() (
    private val dataTransferService: DataTransferService,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: BlockingIOExecutionContext)
    extends BaseController:

  private val SeventyMB = 70000 * 1024

  private def toResult[T](result: Either[DataTransferError, T])(onSuccess: T => Result): Result =
    result match
      case Right(value)                             => onSuccess(value)
      case Left(DataTransferError.QuestionNotFound) => NotFound
      case Left(DataTransferError.FileNotFound)     => BadRequest("file not found")
      case Left(DataTransferError.FileTooLarge)     => BadRequest("i18n_file_too_large")
      case Left(DataTransferError.ErrorCreatingAttachment) =>
        InternalServerError("i18n_error_creating_attachment")
      case Left(DataTransferError.UserNotRecognized) => BadRequest("User not recognized")
      case Left(DataTransferError.ConnectionError(msg)) =>
        if msg == "NotAcceptable" then NotAcceptable
        else if msg == "BadRequest" then BadRequest
        else InternalServerError(msg)

  def importQuestionAttachment(id: Long): Action[MultipartFormData[TemporaryFile]] =
    Action(parse.multipartFormData).andThen(audited) { request =>
      val filePart = request.body.file("file")
      toResult(dataTransferService.importQuestionAttachment(id, filePart))(_ => Created)
    }

  def importData(): Action[JsValue] =
    Action(parse.json(maxLength = SeventyMB)).andThen(audited) { request =>
      toResult(dataTransferService.importData(request.body))(data => Created(data))
    }

  def exportData(): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
      .andThen(audited)
      .async(parse.json) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        dataTransferService.exportData(user, request.body).map {
          case Right(_)    => Created
          case Left(error) => toResult(Left(error): Either[DataTransferError, Unit])(_ => Created)
        }
      }
