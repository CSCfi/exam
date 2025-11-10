// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.user

import io.ebean.{DB, ExpressionList}
import io.ebean.text.PathProperties
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import miscellaneous.user.UserHandler
import models.enrolment.ExamEnrolment
import models.questions.Question
import models.user.{Language, Permission, Role, User}
import play.api.libs.json.JsValue
import play.api.mvc.{Action, AnyContent, BaseController, ControllerComponents}
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import validation.scala.UserLanguageValidator
import validation.scala.core.{ScalaAttrs, Validators}

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

class UserController @Inject() (
    userHandler: UserHandler,
    authenticated: AuthenticatedAction,
    validators: Validators,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  def listPermissions: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Ok(DB.find(classOf[Permission]).list.asJson)
    }

  def grantUserPermission: Action[JsValue] =
    authenticated(parse.json).andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val body             = request.body
      val permissionString = (body \ "permission").as[String]
      val userId           = (body \ "id").as[String]

      Option(DB.find(classOf[User], userId)) match
        case None => NotFound("user not found")
        case Some(user) =>
          if !user.getPermissions.asScala.exists(_.getValue == permissionString) then
            Permission.Type.values().find(_.name() == permissionString) match
              case Some(permType) =>
                DB.find(classOf[Permission]).where().eq("type", permType).find match
                  case Some(permission) =>
                    user.getPermissions.add(permission)
                    user.update()
                    Ok
                  case None => NotFound("permission not found")
              case None =>
                BadRequest("invalid permission type")
          else Ok
    }

  def revokeUserPermission: Action[JsValue] =
    authenticated(parse.json).andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val body             = request.body
      val permissionString = (body \ "permission").as[String]
      val userId           = (body \ "id").as[String]

      Option(DB.find(classOf[User], userId)) match
        case None => NotFound("user not found")
        case Some(user) =>
          if user.getPermissions.asScala.exists(_.getValue == permissionString) then
            Permission.Type.values().find(_.name() == permissionString) match
              case Some(permType) =>
                DB.find(classOf[Permission]).where().eq("type", permType).find match
                  case Some(permission) =>
                    user.getPermissions.remove(permission)
                    user.update()
                    Ok
                  case None => NotFound("permission not found")
              case None =>
                BadRequest("invalid permission type")
          else Ok
    }

  def listUsers(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val pp    = PathProperties.parse("(*, roles(*), permissions(*))")
      val query = DB.find(classOf[User])
      pp.apply(query)

      val results = filter match
        case Some(f) =>
          var el: ExpressionList[User] = query.where().disjunction()
          el = userHandler.applyNameSearch(null, el, f)
          val condition = s"%$f%"
          el.ilike("email", condition)
            .ilike("userIdentifier", condition)
            .ilike("employeeNumber", condition)
            .endJunction()
            .orderBy("lastName, firstName")
            .list
        case None =>
          query.orderBy("lastName, firstName").list

      Ok(results.asJson(pp))
    }

  def addRole(uid: Long, roleName: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Option(DB.find(classOf[User], uid)) match
        case None => NotFound("i18n_user_not_found")
        case Some(user) =>
          if !user.getRoles.asScala.exists(_.getName == roleName) then
            DB.find(classOf[Role]).where().eq("name", roleName).find match
              case None => NotFound("i18n_role_not_found")
              case Some(role) =>
                user.getRoles.add(role)
                user.update()
                Ok
          else Ok
    }

  def removeRole(uid: Long, roleName: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Option(DB.find(classOf[User], uid)) match
        case None => NotFound("i18n_user_not_found")
        case Some(user) =>
          if user.getRoles.asScala.exists(_.getName == roleName) then
            DB.find(classOf[Role]).where().eq("name", roleName).find match
              case None => NotFound("i18n_role_not_found")
              case Some(role) =>
                user.getRoles.remove(role)
                user.update()
                Ok
          else Ok
    }

  def listUsersByRole(role: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val pp    = PathProperties.parse("(*, roles(*), permissions(*))")
      val users = DB.find(classOf[User]).where().eq("roles.name", role).orderBy("lastName").list
      Ok(users.asJson(pp))
    }

  def listQuestionOwners(role: String, criteria: String, qid: Option[Long]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val users  = listUsersByRoleAndName(role, criteria).asJava
      val owners = new java.util.HashSet[User]()
      owners.add(request.attrs(Auth.ATTR_USER))

      qid.foreach { questionId =>
        Option(DB.find(classOf[Question], questionId)).foreach { question =>
          owners.addAll(question.getQuestionOwners)
        }
      }

      users.removeAll(owners)
      Ok(users.asScala.asJson)
    }

  def listTeachers(criteria: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Ok(listUsersByRoleAndName(Role.Name.TEACHER.toString, criteria).asJson)
    }

  def listUnenrolledStudents(eid: Long, criteria: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val enrolments = DB.find(classOf[ExamEnrolment]).where().eq("exam.id", eid).list
      val users      = listUsersByRoleAndName("STUDENT", criteria).asJava
      users.removeAll(enrolments.map(_.getUser).asJava)
      Ok(users.asScala.asJson)
    }

  def updateUserAgreementAccepted(): Action[AnyContent] =
    authenticated { request =>
      val userId = request.attrs(Auth.ATTR_USER).getId
      DB.find(classOf[User])
        .fetch("roles", "name")
        .fetch("language")
        .where()
        .idEq(userId)
        .find match
        case None => NotFound("user not found")
        case Some(user) =>
          user.setUserAgreementAccepted(true)
          user.update()
          Ok
    }

  def updateLanguage(): Action[JsValue] =
    authenticated(parse.json)
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER, Role.Name.STUDENT)))
      .andThen(validators.validated(UserLanguageValidator)) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        val lang = request.attrs(ScalaAttrs.LANG)

        Option(DB.find(classOf[Language], lang)) match
          case None => BadRequest("Unsupported language code")
          case Some(language) =>
            user.setLanguage(language)
            user.update()
            Ok
      }

  private def listUsersByRoleAndName(role: String, nameFilter: String): Seq[User] =
    var el: ExpressionList[User] = DB.find(classOf[User]).where().eq("roles.name", role).disjunction()
    el = userHandler.applyNameSearch(null, el, nameFilter)
    el.endJunction().list
