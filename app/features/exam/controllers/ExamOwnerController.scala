// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.controllers

import database.EbeanJsonExtensions
import features.exam.services.{ExamOwnerError, ExamOwnerService}
import io.ebean.text.PathProperties
import models.user.Role
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import system.AuditedAction

import javax.inject.Inject

class ExamOwnerController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    private val examOwnerService: ExamOwnerService,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private def toResult(error: ExamOwnerError): Result =
    error match
      case ExamOwnerError.ExamNotFound    => NotFound("i18n_error_exam_not_found")
      case ExamOwnerError.UserNotFound    => NotFound("i18n_error_user_not_found")
      case ExamOwnerError.AccessForbidden => Forbidden("i18n_error_access_forbidden")

  def list(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        examOwnerService.listOwners(id) match
          case Left(error) => toResult(error)
          case Right(owners) =>
            Ok(owners.asJson(PathProperties.parse("(*)")))
    }

  def add(eid: Long, uid: Long): Action[AnyContent] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        examOwnerService.addOwner(eid, uid, user) match
          case Left(error) => toResult(error)
          case Right(_)    => Ok
      }

  def remove(eid: Long, uid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        examOwnerService.removeOwner(eid, uid, user) match
          case Left(error) => toResult(error)
          case Right(_)    => Ok
    }
