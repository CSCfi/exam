// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.controllers

import features.facility.services.{AccessibilityError, AccessibilityService}
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc._
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class AccessibilityController @Inject() (
    private val accessibilityService: AccessibilityService,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private def toResult(error: AccessibilityError): Result =
    error match
      case AccessibilityError.NotFound => NotFound(AccessibilityError.NotFound.message)

  def addAccessibility(): Action[JsValue] =
    audited.andThen(authenticated)(parse.json).andThen(authorized(Seq(Role.Name.ADMIN))) { request =>
      val name          = (request.body \ "name").as[String]
      val accessibility = accessibilityService.addAccessibility(name)
      Ok(accessibility.asJson)
    }

  def updateAccessibility(): Action[JsValue] =
    audited.andThen(authenticated)(parse.json).andThen(authorized(Seq(Role.Name.ADMIN))) { request =>
      val name          = (request.body \ "name").as[String]
      val accessibility = accessibilityService.updateAccessibility(name)
      Ok(accessibility.asJson)
    }

  def removeAccessibility(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      accessibilityService.removeAccessibility(id) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }

  def listAccessibilityItems: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      val items = accessibilityService.listAccessibilityItems
      Ok(items.asJson)
    }
