// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.controllers

import features.assessment.services.ReviewDocumentsService
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.Files
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ReviewDocumentsController @Inject() (
    val controllerComponents: ControllerComponents,
    private val reviewDocumentsService: ReviewDocumentsService,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def importGrades: Action[MultipartFormData[Files.TemporaryFile]] = audited
    .andThen(authenticated)(parse.multipartFormData)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      request.body.file("file") match
        case Some(file) =>
          val user = request.attrs(Auth.ATTR_USER)
          reviewDocumentsService.importGrades(file.ref.toFile, user) match
            case Right(_)    => Ok
            case Left(error) => InternalServerError(error)
        case None => NotFound
    }

  def getArchivedAttachments(
      eid: Long,
      start: Option[String],
      end: Option[String]
  ): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      reviewDocumentsService.findExam(eid) match
        case Some(exam) =>
          reviewDocumentsService.getArchivedAttachments(exam, start, end) match
            case Right((body, contentDisposition)) =>
              Ok(body).withHeaders(("Content-Disposition", contentDisposition))
            case Left(error) => InternalServerError(error)
        case None => NotFound
    }
