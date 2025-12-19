// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.controllers

import features.facility.services.{MaintenancePeriodError, MaintenancePeriodService}
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc._
import security.Auth.{AuthenticatedAction, authorized}
import security.AuthExecutionContext
import system.AuditedAction

import javax.inject.Inject

class MaintenancePeriodController @Inject() (
    private val maintenancePeriodService: MaintenancePeriodService,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val controllerComponents: ControllerComponents,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private def toResult(error: MaintenancePeriodError): Result =
    error match
      case MaintenancePeriodError.NotFound => NotFound(MaintenancePeriodError.NotFound.message)
      case MaintenancePeriodError.BadPayload =>
        BadRequest(MaintenancePeriodError.BadPayload.message)

  def listMaintenancePeriods: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(
      Role.Name.STUDENT,
      Role.Name.TEACHER,
      Role.Name.ADMIN,
      Role.Name.SUPPORT
    ))) {
      _ =>
        val periods = maintenancePeriodService.listMaintenancePeriods
        Ok(periods.asJson)
    }

  def createMaintenancePeriod: Action[JsValue] =
    authenticated(parse.json).andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited).async {
      request =>
        maintenancePeriodService.createMaintenancePeriod(request.body).map {
          case Left(error)   => toResult(error)
          case Right(period) => Created(period.asJson)
        }
    }

  def updateMaintenancePeriod(id: Long): Action[JsValue] =
    authenticated(parse.json).andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited).async {
      request =>
        maintenancePeriodService.updateMaintenancePeriod(id, request.body).map {
          case Left(error)   => toResult(error)
          case Right(period) => Ok(period.asJson)
        }
    }

  def removeMaintenancePeriod(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      maintenancePeriodService.removeMaintenancePeriod(id).map {
        case Left(error) => toResult(error)
        case Right(_)    => Ok
      }
    }
