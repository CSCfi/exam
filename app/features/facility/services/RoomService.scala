// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.services

import cats.effect.IO
import cats.effect.unsafe.implicits.global
import database.EbeanQueryExtensions
import features.facility.impl.FacilityHandler
import features.facility.services.RoomError.*
import io.ebean.DB
import io.ebean.text.PathProperties
import models.calendar.{DefaultWorkingHours, ExceptionWorkingHours}
import models.facility.*
import models.user.User
import org.joda.time.format.{DateTimeFormat, ISODateTimeFormat}
import org.joda.time.{DateTime, DateTimeZone}
import play.api.Logging
import play.api.libs.json.{JsArray, JsValue}
import security.BlockingIOExecutionContext
import services.cache.FacilityCache
import services.config.ConfigReader
import services.datetime.DateTimeHandler

import javax.inject.Inject
import scala.concurrent.Future
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

class RoomService @Inject() (
    private val facilityHandler: FacilityHandler,
    private val configReader: ConfigReader,
    private val dateTimeHandler: DateTimeHandler,
    private val facilityCache: FacilityCache,
    implicit private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with Logging:

  private val examVisitActivated = configReader.isVisitingExaminationSupported
  private val defaultTimeZoneId  = configReader.getDefaultTimeZone.getID
  private val EPOCH              = 1970

  private def updateRemote(room: ExamRoom): Future[Unit] =
    if Option(room.getExternalRef).isDefined && examVisitActivated then
      facilityHandler
        .updateFacility(room)
        .map(_ => ())
        .recover { case ex: Throwable =>
          logger.error(s"Failed to update remote facility for room [id=${room.getId}]", ex)
          ()
        }
    else Future.successful(())

  private def asyncUpdateRemote(room: ExamRoom): Unit =
    // Handle remote updates in dedicated threads
    if Option(room.getExternalRef).isDefined && examVisitActivated then
      (IO.sleep(1.second) *> IO.fromFuture(IO(facilityHandler.updateFacility(room))))
        .handleErrorWith(e =>
          IO(logger.error(s"Remote update of exam room #${room.getExternalRef} failed", e))
        )
        .unsafeRunAndForget()

  def getExamRooms(user: User): (List[ExamRoom], PathProperties) =
    val baseQuery = DB
      .find(classOf[ExamRoom])
      .fetch("accessibilities")
      .fetch("examMachines")
      .fetch("defaultWorkingHours")
      .fetch("calendarExceptionEvents")
      .fetch("examStartingHours")
      .where()

    val query =
      if !user.hasRole(models.user.Role.Name.ADMIN) then
        baseQuery.ne("state", ExamRoom.State.INACTIVE.toString)
      else baseQuery

    val rooms = query.list
    rooms.foreach { room =>
      room.getExamMachines.asScala.filterNot(_.isArchived)
      room.setInternalPasswordRequired(Option(room.getInternalPassword).isDefined)
      room.setExternalPasswordRequired(Option(room.getExternalPassword).isDefined)
    }

    val props = PathProperties.parse(
      """(*,
        |mailAddress(*),
        |accessibilities(*),
        |defaultWorkingHours(*),
        |calendarExceptionEvents(*),
        |examStartingHours(*),
        |examMachines(*, softwareInfo(*))
        |)""".stripMargin
    )
    (rooms, props)

  def getExamRoom(id: Long): Either[RoomError, (ExamRoom, PathProperties)] =
    Option(DB.find(classOf[ExamRoom], id)) match
      case None => Left(RoomNotFound)
      case Some(examRoom) =>
        val props = PathProperties.parse(
          """(*,
            |defaultWorkingHours(*),
            |calendarExceptionEvents(*),
            |accessibilities(*),
            |mailAddress(*),
            |examStartingHours(*),
            |examMachines(*)
            |)""".stripMargin
        )
        Right((examRoom, props))

  def createExamRoomDraft: ExamRoom =
    val examRoom = new ExamRoom()
    examRoom.setState("SAVED")
    examRoom.setLocalTimezone(defaultTimeZoneId)
    examRoom.setMailAddress(new MailAddress())
    examRoom.save()
    examRoom

  def validatePassword(roomId: Long, body: JsValue): Either[RoomError, Unit] =
    val isExternalFacility = (body \ "external").asOpt[Boolean].getOrElse(false)
    if isExternalFacility then validateExternalFacilityPassword(body)
    else validateInternalRoomPassword(roomId, body)

  private def validateExternalFacilityPassword(body: JsValue): Either[RoomError, Unit] =
    (body \ "facilityId").asOpt[String] match
      case None => Left(FacilityIdRequired)
      case Some(facilityId) =>
        facilityCache.getFacilityPassword(facilityId) match
          case None => Left(FacilityNotFound)
          case Some(facilityPassword) =>
            (body \ "password").asOpt[String] match
              case Some(providedPassword) if facilityPassword == providedPassword => Right(())
              case _ => Left(InvalidFacilityPassword)

  private def validateInternalRoomPassword(roomId: Long, body: JsValue): Either[RoomError, Unit] =
    Option(DB.find(classOf[ExamRoom], roomId)) match
      case None => Left(RoomNotFound)
      case Some(room) =>
        (body \ "password").asOpt[String] match
          case Some(password) if Option(room.getInternalPassword).contains(password) => Right(())
          case _ => Left(InvalidPassword)

  def updateExamRoom(id: Long, body: JsValue): Future[Either[RoomError, ExamRoom]] =
    Option(DB.find(classOf[ExamRoom], id)) match
      case None => Future.successful(Left(RoomNotFound))
      case Some(existing) =>
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
        (body \ "internalPassword").asOpt[String].foreach { password =>
          existing.setInternalPassword(if password.trim.nonEmpty then password.trim else null)
        }
        (body \ "externalPassword").asOpt[String].foreach { password =>
          existing.setExternalPassword(if password.trim.nonEmpty then password.trim else null)
        }

        existing.update()
        updateRemote(existing).map(_ => Right(existing))

  def updateExamRoomAddress(id: Long, body: JsValue): Future[Either[RoomError, ExamRoom]] =
    Option(DB.find(classOf[MailAddress], id)) match
      case None => Future.successful(Left(AddressNotFound))
      case Some(existing) =>
        DB.find(classOf[ExamRoom]).where().eq("mailAddress", existing).find match
          case None => Future.successful(Left(RoomNotFound))
          case Some(room) =>
            (body \ "city").asOpt[String].foreach(existing.setCity)
            (body \ "street").asOpt[String].foreach(existing.setStreet)
            (body \ "zip").asOpt[String].foreach(existing.setZip)
            existing.update()
            updateRemote(room).map(_ => Right(room))

  private def parseWorkingHours(body: JsValue): DefaultWorkingHours =
    val node      = body \ "workingHours"
    val formatter = ISODateTimeFormat.dateTimeParser()
    val dwh       = new DefaultWorkingHours()
    dwh.setWeekday((node \ "weekday").as[String])
    // Deliberately use Jan to have no DST in effect
    val startTime =
      DateTime.parse((node \ "startTime").as[String], formatter).withDayOfYear(1).withYear(EPOCH)
    val endTime =
      DateTime.parse((node \ "endTime").as[String], formatter).withDayOfYear(1).withYear(EPOCH)
    dwh.setStartTime(startTime)
    dwh.setEndTime(endTime)
    dwh

  def updateExamRoomWorkingHours(body: JsValue): Long =
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

    hours.getId.longValue

  def removeExamRoomWorkingHours(roomId: Long, id: Long): Either[RoomError, Unit] =
    (
      Option(DB.find(classOf[DefaultWorkingHours], id)),
      Option(DB.find(classOf[ExamRoom], roomId))
    ) match
      case (Some(dwh), Some(room)) =>
        dwh.delete()
        room.getDefaultWorkingHours.remove(dwh)
        asyncUpdateRemote(room)
        Right(())
      case _ => Left(WorkingHoursNotFound)

  def updateExamStartingHours(body: JsValue): Unit =
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

  private def parseException(node: JsValue): ExceptionWorkingHours =
    val startDate = ISODateTimeFormat.dateTime().parseDateTime((node \ "startDate").as[String])
    val endDate   = ISODateTimeFormat.dateTime().parseDateTime((node \ "endDate").as[String])
    val hours     = new ExceptionWorkingHours()
    hours.setStartDate(startDate.toDate)
    hours.setEndDate(endDate.toDate)
    hours.setOutOfService((node \ "outOfService").asOpt[Boolean].getOrElse(true))
    hours

  def addRoomExceptionHours(body: JsValue): List[ExceptionWorkingHours] =
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

    rooms.flatMap(_.getCalendarExceptionEvents.asScala)

  def updateExamRoomAccessibility(id: Long, body: JsValue): Either[RoomError, Unit] =
    Option(DB.find(classOf[ExamRoom], id)) match
      case None => Left(RoomNotFound)
      case Some(room) =>
        val ids = (body \ "ids").as[String].split(",").toList.map(_.trim)
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
        Right(())

  def removeRoomExceptionHour(
      roomId: Long,
      exceptionId: Long
  ): Future[Either[RoomError, ExamRoom]] =
    (
      Option(DB.find(classOf[ExceptionWorkingHours], exceptionId)),
      Option(DB.find(classOf[ExamRoom], roomId))
    ) match
      case (Some(exception), Some(room)) =>
        exception.delete()
        room.getCalendarExceptionEvents.remove(exception)
        updateRemote(room).map(_ => Right(room))
      case _ => Future.successful(Left(ExceptionNotFound))

  def inactivateExamRoom(id: Long): Future[Either[RoomError, ExamRoom]] =
    Option(DB.find(classOf[ExamRoom], id)) match
      case None => Future.successful(Left(RoomNotFound))
      case Some(room) =>
        room.setState(ExamRoom.State.INACTIVE.toString)
        room.update()

        if Option(room.getExternalRef).isDefined && examVisitActivated then
          facilityHandler.inactivateFacility(room.getId).map(_ => Right(room))
        else Future.successful(Right(room))

  def activateExamRoom(id: Long): Future[Either[RoomError, ExamRoom]] =
    Option(DB.find(classOf[ExamRoom], id)) match
      case None => Future.successful(Left(RoomNotFound))
      case Some(room) =>
        room.setState(ExamRoom.State.ACTIVE.toString)
        room.update()

        if Option(room.getExternalRef).isDefined && examVisitActivated then
          facilityHandler.activateFacility(room.getId).map(_ => Right(room))
        else Future.successful(Right(room))
