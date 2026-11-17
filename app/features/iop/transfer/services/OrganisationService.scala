// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

import play.api.Logging
import play.api.libs.json.*
import play.api.libs.ws.WSClient
import security.BlockingIOExecutionContext
import services.cache.FacilityCache
import services.config.ConfigReader

import java.net.URI
import javax.inject.Inject
import scala.concurrent.Future
import scala.util.control.NonFatal

class OrganisationService @Inject() (
    wsClient: WSClient,
    configReader: ConfigReader,
    facilityCache: FacilityCache
)(implicit ec: BlockingIOExecutionContext)
    extends Logging:

  private def parseUrl(): String =
    URI.create(s"${configReader.getIopHost}/api/organisations?withFacilities=true").toString

  // Name of this installation's organisation as registered in XM, None when XM cannot tell
  def getHomeOrganisationName: Future[Option[String]] =
    val ref = configReader.getHomeOrganisationRef
    val url = URI.create(s"${configReader.getIopHost}/api/organisations/$ref").toString
    wsClient
      .url(url)
      .get()
      .map { response =>
        if response.status != play.api.http.Status.OK then
          logger.warn(s"Failed to fetch name of organisation $ref: status ${response.status}")
          None
        else (response.json \ "name").asOpt[String].map(_.trim).filter(_.nonEmpty)
      }
      .recover { case NonFatal(e) =>
        logger.warn(s"Failed to fetch name of organisation $ref", e)
        None
      }

  def listOrganisations: scala.concurrent.Future[Either[String, JsValue]] =
    val url      = parseUrl()
    val localRef = configReader.getHomeOrganisationRef

    wsClient.url(url).get().map { response =>
      if response.status != play.api.http.Status.OK then
        val message = (response.json \ "message").asOpt[String].getOrElse("Connection refused")
        Left(message)
      else
        val root = response.json match
          case JsArray(orgs) =>
            JsArray(orgs.map { org =>
              val orgObj    = org.as[JsObject]
              val isHomeOrg = (orgObj \ "_id").asOpt[String].contains(localRef)
              val baseOrg   = orgObj + ("homeOrg" -> JsBoolean(isHomeOrg))

              // Cache facility data for external organizations and set the password requirement flag
              val updatedOrg = (orgObj \ "facilities").asOpt[JsArray].fold(baseOrg) { facilities =>
                val updatedFacilities = JsArray(facilities.value.map { facility =>
                  val facilityObj = facility.as[JsObject]
                  val externalPassword =
                    (facilityObj \ "externalPassword").asOpt[String].filter(_.nonEmpty)
                  val hasPassword = externalPassword.isDefined

                  // Set the flag for a client to know if a password is required
                  val updatedFacility =
                    facilityObj + ("externalPasswordRequired" -> JsBoolean(hasPassword))
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

        Right(root)
    }
