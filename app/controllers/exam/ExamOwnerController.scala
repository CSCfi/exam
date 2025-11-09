// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.exam

import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.exam.Exam
import models.user.{Role, User}
import play.api.mvc.*
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ExamOwnerController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    implicit val ec: ExecutionContext
) extends BaseController
    with JavaApiHelper
    with DbApiHelper:

  def list(id: Long): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      DB.find(classOf[Exam])
        .where
        .idEq(id)
        .find
        .map(e => Ok(e.asJson(PathProperties.parse("examOwners(*)"))))
        .getOrElse(NotFound)
    }

  def add(eid: Long, uid: Long): Action[AnyContent] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      (Option(DB.find(classOf[Exam], eid)), Option(DB.find(classOf[User], uid))) match
        case (Some(exam), Some(owner)) =>
          val user = request.attrs(Auth.ATTR_USER)
          if !user.isAdminOrSupport && !exam.isOwnedOrCreatedBy(user) then Forbidden("i18n_error_access_forbidden")
          else
            exam.getExamOwners.add(owner)
            exam.update()
            Ok
        case _ => NotFound
    }

  def remove(eid: Long, uid: Long): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      (Option(DB.find(classOf[Exam], eid)), Option(DB.find(classOf[User], uid))) match
        case (Some(exam), Some(owner)) =>
          val user = request.attrs(Auth.ATTR_USER)
          if !user.isAdminOrSupport && !exam.isOwnedOrCreatedBy(user) then Forbidden("i18n_error_access_forbidden")
          else
            exam.getExamOwners.remove(owner)
            exam.update()
            Ok
        case _ => NotFound
    }
