// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.facility

import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.calendar.MaintenancePeriod
import models.user.Role
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.libs.json.*
import play.api.libs.ws.WSClient
import play.api.mvc.*
import security.scala.Auth.authorized
import security.scala.AuthExecutionContext
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.Future

class MaintenancePeriodController @Inject() (
    val controllerComponents: ControllerComponents,
    val audited: AuditedAction,
    val configReader: ConfigReader,
    val wsClient: WSClient,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  import play.api.libs.ws.JsonBodyWritables.*

  def listMaintenancePeriods: Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.STUDENT, Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Ok(
        DB.find(classOf[MaintenancePeriod])
          .where()
          .gt("endsAt", DateTime.now())
          .list
          .asJson
      )
    }

  def createMaintenancePeriod: Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited).async { request =>
      request.body.asJson match
        case Some(body) =>
          parseBody(body) match
            case (Some(s), Some(e), Some(d)) =>
              val period = update(new MaintenancePeriod, s, e, d)
              period.save()
              val homeOrg = configReader.getHomeOrganisationRef
              if homeOrg.isEmpty then Future.successful { Created(period.asJson) }
              else
                val periods = DB.find(classOf[MaintenancePeriod]).distinct.asJson
                val payload = Json.obj("maintenancePeriods" -> periods)
                createRequest(homeOrg)
                  .put(payload)
                  .map(_ => Created(period.asJson))
            case _ => Future.successful { BadRequest("Bad payload") }
        case _ => Future.successful { BadRequest("Bad payload") }
    }

  def updateMaintenancePeriod(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited) async { request =>
      request.body.asJson match
        case Some(body) =>
          DB.find(classOf[MaintenancePeriod]).where().idEq(id).find match
            case Some(mp) =>
              parseBody(body) match
                case (Some(s), Some(e), Some(d)) =>
                  val period = update(mp, s, e, d)
                  period.update()
                  val homeOrg = configReader.getHomeOrganisationRef
                  if homeOrg.isEmpty then Future.successful { Ok }
                  else
                    val periods = DB.find(classOf[MaintenancePeriod]).distinct.asJson
                    val payload = Json.obj("maintenancePeriods" -> periods)
                    createRequest(homeOrg)
                      .put(payload)
                      .map(_ => Created(period.asJson))
                case _ => Future.successful { BadRequest }
            case _ => Future.successful { NotFound }
        case _ => Future.successful { BadRequest }
    }

  def removeMaintenancePeriod(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) async { _ =>
      DB.find(classOf[MaintenancePeriod]).where().idEq(id).find match
        case Some(mp) =>
          mp.delete()
          val homeOrg = configReader.getHomeOrganisationRef
          if homeOrg.isEmpty then Future.successful { Ok }
          else
            val periods = DB.find(classOf[MaintenancePeriod]).distinct.asJson
            val payload = Json.obj("maintenancePeriods" -> periods)
            createRequest(homeOrg)
              .put(payload)
              .map(_ => Ok)
        case _ => Future.successful { NotFound }
    }

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

  private def update(period: MaintenancePeriod, start: DateTime, end: DateTime, description: String) =
    period.setStartsAt(start)
    period.setEndsAt(end)
    period.setDescription(description)
    period
