// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.controllers

import features.user.services.{UserError, UserService}
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import validation.UserLanguageValidator
import validation.core.{ScalaAttrs, Validators}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class UserController @Inject() (
    private val userService: UserService,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    validators: Validators,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with EbeanJsonExtensions:

  private def toResult(error: UserError): Result =
    error match
      case UserError.UserNotFound          => NotFound(error.message)
      case UserError.PermissionNotFound    => NotFound(error.message)
      case UserError.InvalidPermissionType => BadRequest(error.message)
      case UserError.RoleNotFound          => NotFound(error.message)
      case UserError.UnsupportedLanguage   => BadRequest(error.message)

  def listPermissions: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Ok(userService.listPermissions.asJson)
    }

  def grantUserPermission: Action[JsValue] =
    authenticated(parse.json)
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(audited) { request =>
        val body             = request.body
        val permissionString = (body \ "permission").as[String]
        val userId           = (body \ "id").as[String]

        userService.grantUserPermission(userId, permissionString) match
          case Left(error) => toResult(error)
          case Right(_)    => Ok
      }

  def revokeUserPermission: Action[JsValue] =
    authenticated(parse.json).andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val body             = request.body
      val permissionString = (body \ "permission").as[String]
      val userId           = (body \ "id").as[String]

      userService.revokeUserPermission(userId, permissionString) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }

  def listUsers(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val (users, pp) = userService.listUsers(filter)
      Ok(users.asJson(pp))
    }

  def addRole(uid: Long, roleName: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))).andThen(audited) { _ =>
      userService.addRole(uid, roleName) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }

  def removeRole(uid: Long, roleName: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      userService.removeRole(uid, roleName) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }

  def listUsersByRole(role: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val (users, pp) = userService.listUsersByRole(role)
      Ok(users.asJson(pp))
    }

  def listQuestionOwners(role: String, criteria: String, qid: Option[Long]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      Ok(userService.listQuestionOwners(role, criteria, qid, user).asJson)
    }

  def listTeachers(criteria: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Ok(userService.listTeachers(criteria).asJson)
    }

  def listUnenrolledStudents(eid: Long, criteria: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Ok(userService.listUnenrolledStudents(eid, criteria).asJson)
    }

  def updateUserAgreementAccepted(): Action[AnyContent] = authenticated.andThen(audited) { request =>
    val userId = request.attrs(Auth.ATTR_USER).getId
    userService.updateUserAgreementAccepted(userId.longValue) match
      case Left(error) => toResult(error)
      case Right(_)    => Ok
  }

  def updateLanguage(): Action[JsValue] =
    authenticated
      .andThen(audited)(parse.json)
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER, Role.Name.STUDENT)))
      .andThen(validators.validated(UserLanguageValidator)) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        val lang = request.attrs(ScalaAttrs.LANG)

        userService.updateLanguage(user.getId.longValue, lang) match
          case Left(error) => toResult(error)
          case Right(_)    => Ok
      }
