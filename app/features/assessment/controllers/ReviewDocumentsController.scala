// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.controllers

import database.EbeanJsonExtensions
import features.assessment.services.ReviewDocumentsService
import models.user.Role
import org.apache.pekko.stream.scaladsl.StreamConverters
import play.api.libs.Files
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import system.AuditedAction

import java.io.{PipedInputStream, PipedOutputStream}
import javax.inject.Inject
import scala.concurrent.Future

class ReviewDocumentsController @Inject() (
    val controllerComponents: ControllerComponents,
    private val reviewDocumentsService: ReviewDocumentsService,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private val TARBALL_MIME = "application/gzip"

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
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))).async {
      _ =>
        reviewDocumentsService.findExam(eid) match
          case None => Future.successful(NotFound)
          case Some(exam) =>
            val pos = new PipedOutputStream()
            val pis = new PipedInputStream(pos)
            Future {
              try reviewDocumentsService.streamArchivedAttachments(exam, start, end)(pos)
              finally pos.close()
            }(using ec)
            Future.successful(
              Ok.chunked(StreamConverters.fromInputStream(() => pis))
                .as(TARBALL_MIME)
                .withHeaders(
                  "Content-Disposition" -> s"attachment; filename=\"exam_${eid}_attachments.tar.gz\""
                )
            )
    }
