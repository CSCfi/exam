// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.controllers

import features.iop.transfer.services.{ExternalExamError, ExternalExamService}
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.Auth.subjectNotPresent
import security.BlockingIOExecutionContext
import system.AuditedAction

import javax.inject.Inject

class ExternalExamController @Inject() (
    private val externalExamService: ExternalExamService,
    audited: AuditedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: BlockingIOExecutionContext)
    extends BaseController:

  private def toResult[T](result: Either[ExternalExamError, T])(onSuccess: T => Result): Result =
    result match
      case Right(value)                              => onSuccess(value)
      case Left(ExternalExamError.EnrolmentNotFound) => Results.NotFound("Enrolment not found")
      case Left(ExternalExamError.InvalidExternalExamData) =>
        Results.BadRequest("Invalid external exam data")
      case Left(ExternalExamError.ParentExamNotFound) => Results.NotFound("Parent exam not found")
      case Left(ExternalExamError.FailedToCreateAssessment) =>
        Results.InternalServerError("Failed to create assessment")
      case Left(ExternalExamError.CouldNotDownloadCollaborativeExam) =>
        Results.InternalServerError("Could not download collaborative exam")
      case Left(ExternalExamError.FailedToProvideEnrolment) =>
        Results.InternalServerError("Failed to provide enrolment")

  def addExamForAssessment(ref: String): Action[JsValue] =
    audited.andThen(subjectNotPresent).async(parse.json) { request =>
      externalExamService.addExamForAssessment(ref, request.body).map {
        case Right(_)    => Results.Created
        case Left(error) => toResult(Left(error): Either[ExternalExamError, Unit])(_ => NotFound)
      }
    }

  def provideEnrolment(ref: String): Action[AnyContent] =
    Action.andThen(subjectNotPresent).async { _ =>
      externalExamService.provideEnrolment(ref).map {
        case Right((json, _)) => Results.Ok(json)
        case Left(error)      => toResult(Left(error): Either[ExternalExamError, Result])(identity)
      }
    }

  def addNoShow(ref: String): Action[AnyContent] =
    audited.andThen(subjectNotPresent) { _ =>
      toResult(externalExamService.addNoShow(ref))(_ => Results.Ok)
    }
