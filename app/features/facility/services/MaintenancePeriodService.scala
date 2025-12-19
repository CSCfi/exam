// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.services

import MaintenancePeriodError._
import io.ebean.DB
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.calendar.MaintenancePeriod
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.libs.json.{JsValue, Json}
import play.api.libs.ws.WSClient
import services.config.ConfigReader

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

class MaintenancePeriodService @Inject() (
    private val configReader: ConfigReader,
    private val wsClient: WSClient,
    implicit private val ec: ExecutionContext
) extends EbeanQueryExtensions
    with EbeanJsonExtensions:

  import play.api.libs.ws.JsonBodyWritables.*

  def listMaintenancePeriods: List[MaintenancePeriod] =
    DB.find(classOf[MaintenancePeriod])
      .where()
      .gt("endsAt", DateTime.now())
      .list

  def createMaintenancePeriod(body: JsValue)
      : Future[Either[MaintenancePeriodError, MaintenancePeriod]] =
    parseBody(body) match
      case (Some(s), Some(e), Some(d)) =>
        val period = update(new MaintenancePeriod, s, e, d)
        period.save()
        val homeOrg = configReader.getHomeOrganisationRef
        if homeOrg.isEmpty then Future.successful(Right(period))
        else
          val periods = DB.find(classOf[MaintenancePeriod]).distinct.asJson
          val payload = Json.obj("maintenancePeriods" -> periods)
          createRequest(homeOrg)
            .put(payload)
            .map(_ => Right(period))
      case _ => Future.successful(Left(BadPayload))

  def updateMaintenancePeriod(
      id: Long,
      body: JsValue
  ): Future[Either[MaintenancePeriodError, MaintenancePeriod]] =
    DB.find(classOf[MaintenancePeriod]).where().idEq(id).find match
      case Some(mp) =>
        parseBody(body) match
          case (Some(s), Some(e), Some(d)) =>
            val period = update(mp, s, e, d)
            period.update()
            val homeOrg = configReader.getHomeOrganisationRef
            if homeOrg.isEmpty then Future.successful(Right(period))
            else
              val periods = DB.find(classOf[MaintenancePeriod]).distinct.asJson
              val payload = Json.obj("maintenancePeriods" -> periods)
              createRequest(homeOrg)
                .put(payload)
                .map(_ => Right(period))
          case _ => Future.successful(Left(BadPayload))
      case _ => Future.successful(Left(NotFound))

  def removeMaintenancePeriod(id: Long): Future[Either[MaintenancePeriodError, Unit]] =
    DB.find(classOf[MaintenancePeriod]).where().idEq(id).find match
      case Some(mp) =>
        mp.delete()
        val homeOrg = configReader.getHomeOrganisationRef
        if homeOrg.isEmpty then Future.successful(Right(()))
        else
          val periods = DB.find(classOf[MaintenancePeriod]).distinct.asJson
          val payload = Json.obj("maintenancePeriods" -> periods)
          createRequest(homeOrg)
            .put(payload)
            .map(_ => Right(()))
      case _ => Future.successful(Left(NotFound))

  private def createRequest(homeOrg: String) =
    wsClient
      .url(s"${configReader.getIopHost}/api/organisations/$homeOrg")
      .addHttpHeaders("Content-Type" -> "application/json")

  private def parseBody(body: JsValue) =
    def parseDate(d: String) = DateTime.parse(d, ISODateTimeFormat.dateTimeParser())
    val start                = (body \ "startsAt").asOpt[String].map(parseDate)
    val end                  = (body \ "endsAt").asOpt[String].map(parseDate)
    val description          = (body \ "description").asOpt[String]
    (start, end, description)

  private def update(
      period: MaintenancePeriod,
      start: DateTime,
      end: DateTime,
      description: String
  ) =
    period.setStartsAt(start)
    period.setEndsAt(end)
    period.setDescription(description)
    period
