// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.facility

import io.ebean.DB
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.facility.{Accessibility, ExamRoom}
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc.{Action, AnyContent, BaseController, ControllerComponents}
import security.scala.Auth.{AuthenticatedAction, authorized}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class AccessibilityController @Inject() (
    authenticated: AuthenticatedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  def addAccessibility(): Action[JsValue] =
    authenticated(parse.json).andThen(authorized(Seq(Role.Name.ADMIN))) { request =>
      val accessibility = new Accessibility()
      accessibility.setName((request.body \ "name").as[String])
      accessibility.save()
      Ok(accessibility.asJson)
    }

  def updateAccessibility(): Action[JsValue] =
    authenticated(parse.json).andThen(authorized(Seq(Role.Name.ADMIN))) { request =>
      val accessibility = new Accessibility()
      accessibility.setName((request.body \ "name").as[String])
      accessibility.update()
      Ok(accessibility.asJson)
    }

  def removeAccessibility(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Option(DB.find(classOf[Accessibility], id)) match
        case None => NotFound("accessibility not found")
        case Some(accessibility) =>
          DB.find(classOf[ExamRoom])
            .where()
            .in("accessibilities", accessibility)
            .list
            .foreach { er =>
              er.getAccessibilities.remove(accessibility)
              er.update()
            }
          accessibility.delete()
          Ok
    }

  def listAccessibilityItems: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      Ok(DB.find(classOf[Accessibility]).list.asJson)
    }
