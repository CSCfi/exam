// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl

import impl.FacilityHandler
import miscellaneous.config.ConfigReader
import models.user.Role
import play.api.libs.ws.WSClient
import play.api.mvc.{Action, AnyContent, BaseController, ControllerComponents}
import security.scala.Auth.{AuthenticatedAction, authorized}

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

class FacilityController @Inject() (
    facilityHandler: FacilityHandler,
    wsClient: WSClient,
    configReader: ConfigReader,
    authenticated: AuthenticatedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController:

  private def parseExternalUrl(orgRef: String): String =
    s"${configReader.getIopHost}/api/organisations/$orgRef/facilities"

  def updateFacility(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      facilityHandler.updateFacilityById(id)
    }

  def listFacilities(organisation: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { _ =>
      organisation match
        case None => Future.successful(BadRequest("Organisation parameter required"))
        case Some(org) =>
          val url = parseExternalUrl(org)
          wsClient.url(url).get().map { response =>
            if response.status != OK then
              val message = (response.json \ "message").asOpt[String].getOrElse("Connection refused")
              InternalServerError(message)
            else
              Ok(response.json)
          }
    }

