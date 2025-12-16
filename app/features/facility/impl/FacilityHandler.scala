// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.impl

import com.google.inject.ImplementedBy
import io.ebean.DB
import io.ebean.text.PathProperties
import database.EbeanJsonExtensions
import models.facility.ExamRoom
import play.api.http.Status.*
import play.api.libs.json.{JsNull, Json}
import play.api.libs.ws.{DefaultBodyWritables, WSClient}
import play.api.mvc.Result
import play.api.mvc.Results.*
import services.config.ConfigReader

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

@ImplementedBy(classOf[FacilityHandlerImpl])
trait FacilityHandler:
  def updateFacility(room: ExamRoom): Future[Result]
  def activateFacility(roomId: Long): Future[Result]
  def inactivateFacility(roomId: Long): Future[Result]
  def updateFacilityById(id: Long): Future[Result]

class FacilityHandlerImpl @Inject() (
    wsClient: WSClient,
    configReader: ConfigReader
)(implicit ec: ExecutionContext)
    extends FacilityHandler
    with DefaultBodyWritables
    with EbeanJsonExtensions:

  private def parseUrl(facilityRef: Option[String]): String =
    val orgRef = configReader.getHomeOrganisationRef
    val base   = s"${configReader.getIopHost}/api/organisations/$orgRef/facilities"
    facilityRef.fold(base)(ref => s"$base/$ref")

  private def toJson(room: ExamRoom): String =
    val pp = PathProperties.parse(
      "(*, defaultWorkingHours(*), calendarExceptionEvents(*), mailAddress(*), " +
        "examStartingHours(*), accessibilities(*))"
    )
    DB.json().toJson(room, pp)

  override def updateFacility(room: ExamRoom): Future[Result] =
    val url = parseUrl(Option(room.getExternalRef))
    wsClient
      .url(url)
      .withHttpHeaders("Content-Type" -> "application/json")
      .put(toJson(room))
      .map(_ => Ok(room.asJson))

  override def activateFacility(roomId: Long): Future[Result] =
    updateFacilityById(roomId)

  override def inactivateFacility(roomId: Long): Future[Result] =
    updateFacilityById(roomId)

  override def updateFacilityById(id: Long): Future[Result] =
    Option(DB.find(classOf[ExamRoom], id)) match
      case None => Future.successful(NotFound("Exam room not found"))
      case Some(room) =>
        val url = parseUrl(Option(room.getExternalRef))

        if Option(room.getExternalRef).isEmpty && room.getState != ExamRoom.State.INACTIVE.toString then
          // Add new
          wsClient
            .url(url)
            .withHttpHeaders("Content-Type" -> "application/json")
            .post(toJson(room))
            .map { response =>
              if response.status != CREATED then
                val message = (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                InternalServerError(message)
              else
                val externalRef = (response.json \ "id").as[String]
                room.setExternalRef(externalRef)
                room.update()
                Ok(Json.obj("externalRef" -> externalRef))
            }
        else if Option(room.getExternalRef).isDefined then
          // Remove
          wsClient.url(url).delete().map { response =>
            if response.status == NOT_FOUND || response.status == OK then
              room.setExternalRef(null)
              room.update()
              Ok(Json.obj("externalRef" -> JsNull))
            else InternalServerError("Connection refused")
          }
        else
          // Tried to add an inactive facility
          Future.successful(BadRequest("Cannot add inactive facility"))
