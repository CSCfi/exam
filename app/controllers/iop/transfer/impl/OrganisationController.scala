// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl

import miscellaneous.cache.FacilityCache
import miscellaneous.config.ConfigReader
import models.user.Role
import play.api.libs.json.*
import play.api.libs.ws.WSClient
import play.api.mvc.{Action, AnyContent, BaseController, ControllerComponents}
import security.scala.Auth.{AuthenticatedAction, authorized}
import system.interceptors.scala.SensitiveDataFilter

import java.net.URI
import javax.inject.Inject
import scala.concurrent.ExecutionContext

class OrganisationController @Inject() (
    wsClient: WSClient,
    configReader: ConfigReader,
    facilityCache: FacilityCache,
    authenticated: AuthenticatedAction,
    sensitiveDataFilter: SensitiveDataFilter,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController:

  private def parseUrl(): String =
    URI.create(s"${configReader.getIopHost}/api/organisations?withFacilities=true").toString

  def listOrganisations: Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT, Role.Name.TEACHER, Role.Name.ADMIN)))
      .andThen(sensitiveDataFilter(Set("internalPassword", "externalPassword")))
      .async { _ =>
        val url      = parseUrl()
        val localRef = configReader.getHomeOrganisationRef

        wsClient.url(url).get().map { response =>
          if response.status != OK then
            val message = (response.json \ "message").asOpt[String].getOrElse("Connection refused")
            InternalServerError(message)
          else
            val root = response.json match
              case JsArray(orgs) =>
                JsArray(orgs.map { org =>
                  val orgObj = org.as[JsObject]
                  val isHomeOrg = (orgObj \ "_id").asOpt[String].contains(localRef)
                  val baseOrg = orgObj + ("homeOrg" -> JsBoolean(isHomeOrg))

                  // Cache facility data for external organizations and set the password requirement flag
                  val updatedOrg = (orgObj \ "facilities").asOpt[JsArray].fold(baseOrg) { facilities =>
                    val updatedFacilities = JsArray(facilities.value.map { facility =>
                      val facilityObj = facility.as[JsObject]
                      val externalPassword = (facilityObj \ "externalPassword").asOpt[String].filter(_.nonEmpty)
                      val hasPassword = externalPassword.isDefined

                      // Set the flag for a client to know if a password is required
                      val updatedFacility = facilityObj + ("externalPasswordRequired" -> JsBoolean(hasPassword))
                      // Cache the password if present
                      for
                        facilityId <- (facilityObj \ "_id").asOpt[String]
                         password   <- externalPassword
                      yield facilityCache.storeFacilityPassword(facilityId, password)
                      updatedFacility
                    })
                    baseOrg + ("facilities" -> updatedFacilities)
                  }

                  updatedOrg
                })
              case other => other

            Ok(root)
        }
      }

