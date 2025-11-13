// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.facility

import impl.FacilityHandler
import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.cache.FacilityCache
import miscellaneous.config.ConfigReader
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.calendar.{DefaultWorkingHours, ExceptionWorkingHours}
import models.facility.{Accessibility, ExamRoom, ExamStartingHour, MailAddress}
import models.user.Role
import org.apache.pekko.actor.ActorSystem
import org.joda.time.format.{DateTimeFormat, ISODateTimeFormat}
import org.joda.time.{DateTime, DateTimeZone}
import play.api.Logging
import play.api.libs.json.{JsArray, JsValue, Json}
import play.api.mvc.*
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import system.interceptors.scala.SensitiveDataFilter

import javax.inject.Inject
import scala.concurrent.duration.*
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*

class RoomController @Inject() (
    facilityHandler: FacilityHandler,
    actorSystem: ActorSystem,
    configReader: ConfigReader,
    dateTimeHandler: DateTimeHandler,
    facilityCache: FacilityCache,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    sensitiveDataFilter: SensitiveDataFilter,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with DbApiHelper
    with JavaApiHelper
    with Logging:

  private val examVisitActivated = configReader.isVisitingExaminationSupported
  private val defaultTimeZoneId  = configReader.getDefaultTimeZone.getID
  private val EPOCH              = 1970

  private def updateRemote(room: ExamRoom): Future[Result] =
    if Option(room.getExternalRef).isDefined && examVisitActivated then
      facilityHandler
        .updateFacility(room)
        .map(_ => Ok(Json.obj()))
        .recover { case ex: Throwable =>
          InternalServerError(Json.obj("error" -> ex.getMessage))
        }
    else Future.successful(Ok)

  private def asyncUpdateRemote(room: ExamRoom): Unit =
    // Handle remote updates in dedicated threads
    if Option(room.getExternalRef).isDefined && examVisitActivated then
      actorSystem.scheduler.scheduleOnce(1.second) {
        facilityHandler.updateFacility(room).recover { case e: Exception =>
          logger.error(s"Remote update of exam room #${room.getExternalRef} failed", e)
        }
      }

  def getExamRooms: Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.SUPPORT, Role.Name.ADMIN, Role.Name.STUDENT)))
      .andThen(sensitiveDataFilter(Set("internalPassword", "externalPassword"))) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        var query = DB
          .find(classOf[ExamRoom])
          .fetch("accessibilities")
          .fetch("examMachines")
          .fetch("defaultWorkingHours")
          .fetch("calendarExceptionEvents")
          .fetch("examStartingHours")
          .where()

        if !user.hasRole(Role.Name.ADMIN) then query = query.ne("state", ExamRoom.State.INACTIVE.toString)

        val rooms = query.list
        rooms.foreach { room =>
          room.getExamMachines.removeIf(_.isArchived)
          room.setInternalPasswordRequired(Option(room.getInternalPassword).isDefined)
          room.setExternalPasswordRequired(Option(room.getExternalPassword).isDefined)
        }

        val props = PathProperties.parse(
          "(*, mailAddress(*), accessibilities(*), defaultWorkingHours(*), calendarExceptionEvents(*), examStartingHours(*), examMachines(*, softwareInfo(*)))"
        )
        Ok(rooms.asJson(props))
      }

  def getExamRoom(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Option(DB.find(classOf[ExamRoom], id)) match
        case None => NotFound("room not found")
        case Some(examRoom) =>
          val props = PathProperties.parse(
            "(*, defaultWorkingHours(*), calendarExceptionEvents(*), accessibilities(*), mailAddress(*), examStartingHours(*), examMachines(*))"
          )
          Ok(examRoom.asJson(props))
    }

  def createExamRoomDraft: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val examRoom = new ExamRoom()
      examRoom.setState("SAVED")
      examRoom.setLocalTimezone(defaultTimeZoneId)
      examRoom.setMailAddress(new MailAddress())
      examRoom.save()
      Ok(examRoom.asJson)
    }

  def validatePassword(roomId: Long): Action[JsValue] = audited
    .andThen(authenticated)(parse.json)
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      val body = request.body

      // Check if this is an external facility validation
      val isExternalFacility = (body \ "external").asOpt[Boolean].getOrElse(false)
      if isExternalFacility then validateExternalFacilityPassword(body)
      else validateInternalRoomPassword(roomId, body)
    }

  private def validateExternalFacilityPassword(body: JsValue): Result =
    (body \ "facilityId").asOpt[String] match
      case None => BadRequest("facilityId is required")
      case Some(facilityId) =>
        facilityCache.getFacilityPassword(facilityId) match
          case None => NotFound("Facility not found")
          case Some(facilityPassword) =>
            (body \ "password").asOpt[String] match
              case Some(providedPassword) if facilityPassword == providedPassword => Ok
              case _ => Forbidden("Invalid password for facility")

  private def validateInternalRoomPassword(roomId: Long, body: JsValue): Result =
    Option(DB.find(classOf[ExamRoom], roomId)) match
      case None => NotFound("room not found")
      case Some(room) =>
        (body \ "password").asOpt[String] match
          case Some(password) if Option(room.getInternalPassword).contains(password) => Ok
          case _                                                                     => Forbidden("Invalid password")

  def updateExamRoom(id: Long): Action[JsValue] = audited
    .andThen(authenticated)(parse.json)
    .andThen(authorized(Seq(Role.Name.ADMIN)))
    .async { request =>
      Option(DB.find(classOf[ExamRoom], id)) match
        case None => Future.successful(NotFound("room not found"))
        case Some(existing) =>
          val body = request.body
          (body \ "name").asOpt[String].foreach(existing.setName)
          (body \ "roomCode").asOpt[String].foreach(existing.setRoomCode)
          (body \ "buildingName").asOpt[String].foreach(existing.setBuildingName)
          (body \ "campus").asOpt[String].foreach(existing.setCampus)
          (body \ "accessible").asOpt[Boolean].foreach(v => existing.setAccessible(v))
          (body \ "roomInstruction").asOpt[String].foreach(existing.setRoomInstruction)
          (body \ "roomInstructionEN").asOpt[String].foreach(existing.setRoomInstructionEN)
          (body \ "roomInstructionSV").asOpt[String].foreach(existing.setRoomInstructionSV)
          (body \ "contactPerson").asOpt[String].foreach(existing.setContactPerson)
          (body \ "videoRecordingsURL").asOpt[String].foreach(existing.setVideoRecordingsURL)
          (body \ "statusComment").asOpt[String].foreach(existing.setStatusComment)
          (body \ "outOfService").asOpt[Boolean].foreach(v => existing.setOutOfService(v))
          (body \ "state").asOpt[String].foreach(existing.setState)
          (body \ "internalPassword").asOpt[String].foreach(existing.setInternalPassword)
          (body \ "externalPassword").asOpt[String].foreach(existing.setExternalPassword)

          existing.update()
          updateRemote(existing)
    }

  def updateExamRoomAddress(id: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.ADMIN)))(parse.json)
    .async { request =>
      Option(DB.find(classOf[MailAddress], id)) match
        case None => Future.successful(NotFound("address not found"))
        case Some(existing) =>
          DB.find(classOf[ExamRoom]).where().eq("mailAddress", existing).find match
            case None => Future.successful(NotFound("room not found"))
            case Some(room) =>
              val body = request.body
              (body \ "city").asOpt[String].foreach(existing.setCity)
              (body \ "street").asOpt[String].foreach(existing.setStreet)
              (body \ "zip").asOpt[String].foreach(existing.setZip)
              existing.update()
              updateRemote(room)
    }

  private def parseWorkingHours(body: JsValue): DefaultWorkingHours =
    val node      = body \ "workingHours"
    val formatter = ISODateTimeFormat.dateTimeParser()
    val dwh       = new DefaultWorkingHours()
    dwh.setWeekday((node \ "weekday").as[String])
    // Deliberately use Jan to have no DST in effect
    val startTime = DateTime.parse((node \ "startTime").as[String], formatter).withDayOfYear(1).withYear(EPOCH)
    val endTime   = DateTime.parse((node \ "endTime").as[String], formatter).withDayOfYear(1).withYear(EPOCH)
    dwh.setStartTime(startTime)
    dwh.setEndTime(endTime)
    dwh

  def updateExamRoomWorkingHours(): Action[JsValue] =
    authenticated(parse.json).andThen(authorized(Seq(Role.Name.ADMIN))) { request =>
      val body    = request.body
      val roomIds = (body \ "roomIds").as[List[Long]]
      val rooms   = DB.find(classOf[ExamRoom]).where().idIn(roomIds.map(Long.box).asJava).list
      val hours   = parseWorkingHours(body)

      rooms.foreach { examRoom =>
        // Find out if there's any overlap. Remove those
        val existing = DB
          .find(classOf[DefaultWorkingHours])
          .where()
          .eq("room", examRoom)
          .eq("weekday", hours.getWeekday)
          .list

        val overlapping = existing.filter(_.overlaps(hours))
        DB.deleteAll(overlapping.asJava)
        overlapping.foreach(examRoom.getDefaultWorkingHours.remove)

        hours.setRoom(examRoom)
        val end            = new DateTime(hours.getEndTime)
        val offset         = DateTimeZone.forID(examRoom.getLocalTimezone).getOffset(end)
        val endMillisOfDay = dateTimeHandler.resolveEndWorkingHourMillis(end, offset) - offset
        hours.setEndTime(end.withMillisOfDay(endMillisOfDay))
        hours.setTimezoneOffset(offset)
        hours.save()
        examRoom.getDefaultWorkingHours.add(hours)
        asyncUpdateRemote(examRoom)
      }

      Ok(Json.obj("id" -> hours.getId.longValue))
    }

  def removeExamRoomWorkingHours(roomId: Long, id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      (Option(DB.find(classOf[DefaultWorkingHours], id)), Option(DB.find(classOf[ExamRoom], roomId))) match
        case (Some(dwh), Some(room)) =>
          dwh.delete()
          room.getDefaultWorkingHours.remove(dwh)
          asyncUpdateRemote(room)
          Ok
        case _ => Forbidden("working hours or room not found")
    }

  def updateExamStartingHours(): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.ADMIN)))(parse.json) { request =>
      val body      = request.body
      val roomIds   = (body \ "roomIds").as[List[Long]]
      val rooms     = DB.find(classOf[ExamRoom]).where().idIn(roomIds.map(Long.box).asJava).list
      val formatter = DateTimeFormat.forPattern("dd.MM.yyyy HH:mmZZ")

      rooms.foreach { examRoom =>
        val previous = DB.find(classOf[ExamStartingHour]).where().eq("room.id", examRoom.getId).list
        DB.deleteAll(previous.asJava)

        (body \ "hours").as[JsArray].value.foreach { hoursNode =>
          val esh = new ExamStartingHour()
          esh.setRoom(examRoom)
          // Deliberately use the first/second of Jan to have no DST in effect
          val startTime = DateTime.parse(hoursNode.as[String], formatter).withDayOfYear(1)
          esh.setStartingHour(startTime.toDate)
          esh.setTimezoneOffset(DateTimeZone.forID(examRoom.getLocalTimezone).getOffset(startTime))
          esh.save()
        }
        asyncUpdateRemote(examRoom)
      }

      Ok
    }

  private def parseException(node: JsValue): ExceptionWorkingHours =
    val startDate = ISODateTimeFormat.dateTime().parseDateTime((node \ "startDate").as[String])
    val endDate   = ISODateTimeFormat.dateTime().parseDateTime((node \ "endDate").as[String])
    val hours     = new ExceptionWorkingHours()
    hours.setStartDate(startDate.toDate)
    hours.setEndDate(endDate.toDate)
    hours.setOutOfService((node \ "outOfService").asOpt[Boolean].getOrElse(true))
    hours

  def addRoomExceptionHours(): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.ADMIN)))(parse.json) { request =>
      val body           = request.body
      val exceptionsNode = (body \ "exceptions").as[JsArray]
      val roomIds        = (body \ "roomIds").as[List[Long]]
      val rooms          = DB.find(classOf[ExamRoom]).where().idIn(roomIds.map(Long.box).asJava).list

      rooms.foreach { room =>
        exceptionsNode.value.foreach { node =>
          val exception = parseException(node)
          exception.setStartDateTimezoneOffset(
            DateTimeZone.forID(room.getLocalTimezone).getOffset(exception.getStartDate.getTime)
          )
          exception.setEndDateTimezoneOffset(
            DateTimeZone.forID(room.getLocalTimezone).getOffset(exception.getEndDate.getTime)
          )
          exception.setRoom(room)
          exception.save()
          room.getCalendarExceptionEvents.add(exception)
        }
        asyncUpdateRemote(room)
      }

      val allExceptions = rooms.flatMap(_.getCalendarExceptionEvents.asScala)
      Ok(allExceptions.asJson)
    }

  def updateExamRoomAccessibility(id: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.ADMIN)))(parse.json) { request =>
      Option(DB.find(classOf[ExamRoom], id)) match
        case None => NotFound("room not found")
        case Some(room) =>
          val ids = (request.body \ "ids").as[String].split(",").toList.map(_.trim)
          room.getAccessibilities.clear()
          room.save()

          if ids.nonEmpty && ids.head.nonEmpty then
            ids.foreach { aid =>
              scala.util.Try(aid.toInt).foreach { accessibilityId =>
                Option(DB.find(classOf[Accessibility], accessibilityId)).foreach { accessibility =>
                  room.getAccessibilities.add(accessibility)
                  room.save()
                  asyncUpdateRemote(room)
                }
              }
            }
          Ok
    }

  def removeRoomExceptionHour(roomId: Long, exceptionId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      (Option(DB.find(classOf[ExceptionWorkingHours], exceptionId)), Option(DB.find(classOf[ExamRoom], roomId))) match
        case (Some(exception), Some(room)) =>
          exception.delete()
          room.getCalendarExceptionEvents.remove(exception)
          updateRemote(room)
        case _ => Future.successful(NotFound("exception or room not found"))
    }

  def inactivateExamRoom(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      Option(DB.find(classOf[ExamRoom], id)) match
        case None => Future.successful(NotFound("room not found"))
        case Some(room) =>
          room.setState(ExamRoom.State.INACTIVE.toString)
          room.update()

          if Option(room.getExternalRef).isDefined && examVisitActivated then
            facilityHandler.inactivateFacility(room.getId).map(_ => Ok(room.asJson))
          else Future.successful(Ok(room.asJson))
    }

  def activateExamRoom(id: Long): Action[AnyContent] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.ADMIN)))
    .async { _ =>
      Option(DB.find(classOf[ExamRoom], id)) match
        case None => Future.successful(NotFound("room not found"))
        case Some(room) =>
          room.setState(ExamRoom.State.ACTIVE.toString)
          room.update()

          if Option(room.getExternalRef).isDefined && examVisitActivated then
            facilityHandler.activateFacility(room.getId).map(_ => Ok(room.asJson))
          else Future.successful(Ok(room.asJson))
    }
