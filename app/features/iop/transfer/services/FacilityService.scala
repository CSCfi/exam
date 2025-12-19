// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

import features.facility.impl.FacilityHandler
import play.api.libs.ws.WSClient
import services.config.ConfigReader

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

class FacilityService @Inject() (
    facilityHandler: FacilityHandler,
    wsClient: WSClient,
    configReader: ConfigReader
)(implicit ec: ExecutionContext):

  private def parseExternalUrl(orgRef: String): String =
    s"${configReader.getIopHost}/api/organisations/$orgRef/facilities"

  def updateFacility(id: Long): Future[play.api.mvc.Result] =
    facilityHandler.updateFacilityById(id)

  def listFacilities(organisation: Option[String])
      : Future[Either[String, play.api.libs.json.JsValue]] =
    organisation match
      case None => Future.successful(Left("Organisation parameter required"))
      case Some(org) =>
        val url = parseExternalUrl(org)
        wsClient.url(url).get().map { response =>
          if response.status != play.api.http.Status.OK then
            val message = (response.json \ "message").asOpt[String].getOrElse("Connection refused")
            Left(message)
          else Right(response.json)
        }
