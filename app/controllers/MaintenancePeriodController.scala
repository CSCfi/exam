/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package controllers

import io.ebean.DB
import models.Role
import models.calendar.MaintenancePeriod
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.libs.json.JsValue
import play.api.mvc._
import security.scala.Auth.authorized
import security.scala.AuthExecutionContext
import system.AuditedAction
import util.scala.JavaApiHelper

import javax.inject.Inject

class MaintenancePeriodController @Inject() (
    val controllerComponents: ControllerComponents,
    val audited: AuditedAction,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with JavaApiHelper:

  def listMaintenancePeriods: Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))).andThen(audited) { _ =>
      DB.find(classOf[MaintenancePeriod])
        .where()
        .gt("endsAt", DateTime.now())
        .list
        .toResult(Ok)
    }

  def createMaintenancePeriod: Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited) { request =>
      request.body.asJson match
        case Some(body) =>
          parseBody(body) match
            case (Some(s), Some(e), Some(d)) =>
              val period = update(new MaintenancePeriod, s, e, d)
              period.save()
              period.toResult(Created)
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
    Action.andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited) { _ =>
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
