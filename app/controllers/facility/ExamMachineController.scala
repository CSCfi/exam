// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.facility

import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.Reservation
import models.facility.{ExamMachine, ExamRoom, Software}
import models.user.Role
import org.joda.time.DateTime
import play.api.libs.json.{JsValue, Json}
import play.api.mvc.{Action, AnyContent, BaseController, ControllerComponents}
import security.scala.Auth.{AuthenticatedAction, authorized}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ExamMachineController @Inject() (
    authenticated: AuthenticatedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  def getExamMachines: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val machines = DB.find(classOf[ExamMachine]).where().eq("archived", false).list
      Ok(machines.asJson)
    }

  def getExamMachine(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      val pp    = PathProperties.parse("(*, softwareInfo(*), room(name, buildingName))")
      val query = DB.find(classOf[ExamMachine])
      pp.apply(query)
      Option(query.where().idEq(id).findOne()) match
        case None          => NotFound("machine not found")
        case Some(machine) => Ok(machine.asJson(pp))
    }

  def getExamMachineReservationsFromNow(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val reservations = DB
        .find(classOf[Reservation])
        .where()
        .eq("machine.id", id)
        .gt("endAt", DateTime.now())
        .list

      Ok(reservations.asJson)
    }

  def updateExamMachine(id: Long): Action[JsValue] =
    authenticated(parse.json).andThen(authorized(Seq(Role.Name.ADMIN))) { request =>
      Option(DB.find(classOf[ExamMachine], id)) match
        case None => NotFound("machine not found")
        case Some(dest) =>
          val body = request.body

          // Check for IP address conflicts
          val ipConflict = (body \ "ipAddress").asOpt[String].filter(_.nonEmpty).flatMap { newIp =>
            val existingIps = DB
              .find(classOf[ExamMachine])
              .list
              .filter(m => !m.equals(dest))
              .flatMap(m => Option(m.getIpAddress))

            if existingIps.contains(newIp) then Some("i18n_error_ip_address_exists_for_room")
            else None
          }

          ipConflict match
            case Some(error) => Forbidden(error)
            case None =>
              (body \ "name").asOpt[String].foreach(dest.setName)
              (body \ "otherIdentifier").asOpt[String].foreach(dest.setOtherIdentifier)
              (body \ "accessibilityInfo").asOpt[String].foreach(dest.setAccessibilityInfo)
              (body \ "accessible").asOpt[Boolean].foreach(v => dest.setAccessible(v))
              (body \ "ipAddress").asOpt[String].foreach(dest.setIpAddress)
              (body \ "surveillanceCamera").asOpt[String].foreach(dest.setSurveillanceCamera)
              (body \ "videoRecordings").asOpt[String].foreach(dest.setVideoRecordings)
              (body \ "expanded").asOpt[Boolean].foreach(v => dest.setExpanded(v))
              (body \ "statusComment").asOpt[String].foreach(dest.setStatusComment)
              (body \ "outOfService").asOpt[Boolean].foreach(v => dest.setOutOfService(v))

              dest.update()
              val pp = PathProperties.parse("(*, softwareInfo(*), room(name, buildingName))")
              Ok(dest.asJson(pp))
    }

  def resetMachineSoftware(mid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Option(DB.find(classOf[ExamMachine], mid)) match
        case None => NotFound("machine not found")
        case Some(machine) =>
          machine.getSoftwareInfo.clear()
          machine.update()
          val pp = PathProperties.parse("(*, softwareInfo(*), room(name, buildingName))")
          Ok(machine.asJson(pp))
    }

  def updateMachineSoftware(mid: Long, sid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Option(DB.find(classOf[ExamMachine], mid)) match
        case None => NotFound("machine not found")
        case Some(machine) =>
          Option(DB.find(classOf[Software], sid)) match
            case None => NotFound("software not found")
            case Some(software) =>
              val isTurnedOn =
                if machine.getSoftwareInfo.contains(software) then
                  machine.getSoftwareInfo.remove(software)
                  false
                else
                  machine.getSoftwareInfo.add(software)
                  true

              machine.update()
              Ok(Json.obj("turnedOn" -> isTurnedOn))
    }

  def insertExamMachine(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Option(DB.find(classOf[ExamRoom], id)) match
        case None => NotFound("room not found")
        case Some(room) =>
          val machine = new ExamMachine()
          room.getExamMachines.add(machine)
          room.save()
          machine.save()
          Ok(machine.asJson)
    }

  def removeExamMachine(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      // SIT-690
      Forbidden("Machine removal is not allowed")
    }

  def listSoftware: Action[AnyContent] =
    authenticated { _ =>
      val software = DB
        .find(classOf[Software])
        .where()
        .or()
        .isNull("status")
        .eq("status", "ACTIVE")
        .endOr()
        .list

      Ok(software.asJson)
    }

  def getSoftware(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Option(DB.find(classOf[Software], id)) match
        case None           => NotFound("software not found")
        case Some(software) => Ok(software.asJson)
    }

  private def checkSoftwareName(name: String): Option[String] =
    val existing = DB.find(classOf[Software]).where().ieq("name", name).list
    if existing.isEmpty then None
    else Some("Software with that name already exists")

  def addSoftware(name: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      checkSoftwareName(name) match
        case Some(error) => BadRequest(error)
        case None =>
          val software = new Software()
          software.setName(name)
          software.save()
          Ok(software.asJson)
    }

  def updateSoftware(id: Long, name: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Option(DB.find(classOf[Software], id)) match
        case None => NotFound("software not found")
        case Some(software) =>
          checkSoftwareName(name) match
            case Some(error) => BadRequest(error)
            case None =>
              software.setName(name)
              software.update()
              Ok(software.asJson)
    }

  def removeSoftware(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Option(DB.find(classOf[Software], id)) match
        case None => NotFound("software not found")
        case Some(software) =>
          software.delete()
          Ok
    }
