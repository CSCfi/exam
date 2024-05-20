// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers

import io.ebean.DB
import models.calendar.MaintenancePeriod
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.libs.json.JsValue
import play.api.mvc._
import security.scala.Auth.authorized
import security.scala.AuthExecutionContext
import system.AuditedAction
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.user.Role

import javax.inject.Inject

class MaintenancePeriodController @Inject() (
    val controllerComponents: ControllerComponents,
    val audited: AuditedAction,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  def listMaintenancePeriods: Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.STUDENT, Role.Name.TEACHER, Role.Name.ADMIN))) { _ =>
      Ok(
        DB.find(classOf[MaintenancePeriod])
          .where()
          .gt("endsAt", DateTime.now())
          .list
          .toJson
      )
    }

  def createMaintenancePeriod: Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited) { request =>
      request.body.asJson match
        case Some(body) =>
          parseBody(body) match
            case (Some(s), Some(e), Some(d)) =>
              val period = update(new MaintenancePeriod, s, e, d)
              period.save()
              Created(period.toJson)
            case _ => BadRequest
        case _ => BadRequest
    }

  def updateMaintenancePeriod(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited) { request =>
      request.body.asJson match
        case Some(body) =>
          DB.find(classOf[MaintenancePeriod]).where().idEq(id).find match
            case Some(mp) =>
              parseBody(body) match
                case (Some(s), Some(e), Some(d)) =>
                  val period = update(mp, s, e, d)
                  period.update()
                  Ok
                case _ => BadRequest
            case _ => NotFound
        case _ => BadRequest
    }

  def removeMaintenancePeriod(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      DB.find(classOf[MaintenancePeriod]).where().idEq(id).find match
        case Some(mp) =>
          mp.delete()
          Ok
        case _ => NotFound
    }

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
