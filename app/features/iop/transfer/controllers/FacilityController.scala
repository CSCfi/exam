// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.controllers

import features.iop.transfer.services.FacilityService
import models.user.Role
import play.api.mvc._
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class FacilityController @Inject() (
    private val facilityService: FacilityService,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController:

  def updateFacility(id: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      facilityService.updateFacility(id)
    }

  def listFacilities(organisation: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { _ =>
      facilityService.listFacilities(organisation).map {
        case Left(message) => BadRequest(message)
        case Right(json)   => Ok(json)
      }
    }
