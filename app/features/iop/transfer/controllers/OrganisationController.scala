// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.controllers

import features.iop.transfer.services.OrganisationService
import models.user.Role
import play.api.mvc._
import security.Auth.{AuthenticatedAction, authorized}
import system.interceptors.SensitiveDataFilter

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class OrganisationController @Inject() (
    private val organisationService: OrganisationService,
    authenticated: AuthenticatedAction,
    sensitiveDataFilter: SensitiveDataFilter,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController:

  def listOrganisations: Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT, Role.Name.TEACHER, Role.Name.ADMIN)))
      .andThen(sensitiveDataFilter(Set("internalPassword", "externalPassword")))
      .async { _ =>
        organisationService.listOrganisations.map {
          case Left(message) => InternalServerError(message)
          case Right(json)   => Ok(json)
        }
      }
