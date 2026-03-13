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
    if Option(room.externalRef).isDefined && examVisitActivated then
      facilityHandler
        .updateFacility(room)
        .map(_ => ())
        .recover { case ex: Throwable =>
          logger.error(s"Failed to update remote facility for room [id=${room.id}]", ex)
          ()
        }
    else Future.successful(())

  private def asyncUpdateRemote(room: ExamRoom): Unit =
    // Handle remote updates in dedicated threads
    if Option(room.externalRef).isDefined && examVisitActivated then
      (IO.sleep(1.second) *> IO.fromFuture(IO(facilityHandler.updateFacility(room))))
        .handleErrorWith(e =>
          IO(logger.error(s"Remote update of exam room #${room.externalRef} failed", e))
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
      room.examMachines.asScala.filterNot(_.archived)
      room.internalPasswordRequired = Option(room.internalPassword).isDefined
      room.externalPasswordRequired = Option(room.externalPassword).isDefined
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
    examRoom.state = "SAVED"
    examRoom.localTimezone = defaultTimeZoneId
    examRoom.mailAddress = new MailAddress()
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
          case Some(password) if Option(room.internalPassword).contains(password) => Right(())
          case _ => Left(InvalidPassword)

  def updateExamRoom(id: Long, body: JsValue): Future[Either[RoomError, ExamRoom]] =
    Option(DB.find(classOf[ExamRoom], id)) match
      case None => Future.successful(Left(RoomNotFound))
      case Some(existing) =>
        (body \ "name").asOpt[String].foreach(v => existing.name = v)
        (body \ "roomCode").asOpt[String].foreach(v => existing.roomCode = v)
        (body \ "buildingName").asOpt[String].foreach(v => existing.buildingName = v)
        (body \ "campus").asOpt[String].foreach(v => existing.campus = v)
        (body \ "accessible").asOpt[Boolean].foreach(v => existing.accessible = v)
        (body \ "roomInstruction").asOpt[String].foreach(v => existing.roomInstruction = v)
        (body \ "roomInstructionEN").asOpt[String].foreach(v => existing.roomInstructionEN = v)
        (body \ "roomInstructionSV").asOpt[String].foreach(v => existing.roomInstructionSV = v)
        (body \ "contactPerson").asOpt[String].foreach(v => existing.contactPerson = v)
        (body \ "videoRecordingsURL").asOpt[String].foreach(v => existing.videoRecordingsURL = v)
        (body \ "statusComment").asOpt[String].foreach(v => existing.statusComment = v)
        (body \ "outOfService").asOpt[Boolean].foreach(v => existing.outOfService = v)
        (body \ "state").asOpt[String].foreach(v => existing.state = v)
        (body \ "internalPassword").asOpt[String].foreach { password =>
          existing.internalPassword = if password.trim.nonEmpty then password.trim else null
        }
        (body \ "externalPassword").asOpt[String].foreach { password =>
          existing.externalPassword = if password.trim.nonEmpty then password.trim else null
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
            (body \ "city").asOpt[String].foreach(v => existing.city = v)
            (body \ "street").asOpt[String].foreach(v => existing.street = v)
            (body \ "zip").asOpt[String].foreach(v => existing.zip = v)
            existing.update()
            updateRemote(room).map(_ => Right(room))

  private def parseWorkingHours(body: JsValue): DefaultWorkingHours =
    val node      = body \ "workingHours"
    val formatter = ISODateTimeFormat.dateTimeParser()
    val dwh       = new DefaultWorkingHours()
    dwh.weekday = (node \ "weekday").as[String]
    // Deliberately use Jan to have no DST in effect
    val startTime =
      DateTime.parse((node \ "startTime").as[String], formatter).withDayOfYear(1).withYear(EPOCH)
    val endTime =
      DateTime.parse((node \ "endTime").as[String], formatter).withDayOfYear(1).withYear(EPOCH)
    dwh.startTime = startTime
    dwh.endTime = endTime
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
        .eq("weekday", hours.weekday)
        .list

      val overlapping = existing.filter(_.overlaps(hours))
      DB.deleteAll(overlapping.asJava)
      overlapping.foreach(examRoom.defaultWorkingHours.remove)

      hours.room = examRoom
      val end            = new DateTime(hours.endTime)
      val offset         = DateTimeZone.forID(examRoom.localTimezone).getOffset(end)
      val endMillisOfDay = dateTimeHandler.resolveEndWorkingHourMillis(end, offset) - offset
      hours.endTime = end.withMillisOfDay(endMillisOfDay)
      hours.timezoneOffset = offset
      hours.save()
      examRoom.defaultWorkingHours.add(hours)
      asyncUpdateRemote(examRoom)
    }

    hours.id.longValue

  def removeExamRoomWorkingHours(roomId: Long, id: Long): Either[RoomError, Unit] =
    (
      Option(DB.find(classOf[DefaultWorkingHours], id)),
      Option(DB.find(classOf[ExamRoom], roomId))
    ) match
      case (Some(dwh), Some(room)) =>
        dwh.delete()
        room.defaultWorkingHours.remove(dwh)
        asyncUpdateRemote(room)
        Right(())
      case _ => Left(WorkingHoursNotFound)

  def updateExamStartingHours(body: JsValue): Unit =
    val roomIds   = (body \ "roomIds").as[List[Long]]
    val rooms     = DB.find(classOf[ExamRoom]).where().idIn(roomIds.map(Long.box).asJava).list
    val formatter = DateTimeFormat.forPattern("dd.MM.yyyy HH:mmZZ")

    rooms.foreach { examRoom =>
      val previous = DB.find(classOf[ExamStartingHour]).where().eq("room.id", examRoom.id).list
      DB.deleteAll(previous.asJava)

      (body \ "hours").as[JsArray].value.foreach { hoursNode =>
        val esh = new ExamStartingHour()
        esh.room = examRoom
        // Deliberately use the first/second of Jan to have no DST in effect
        val startTime = DateTime.parse(hoursNode.as[String], formatter).withDayOfYear(1)
        esh.startingHour = startTime.toDate
        esh.timezoneOffset = DateTimeZone.forID(examRoom.localTimezone).getOffset(startTime)
        esh.save()
      }
      asyncUpdateRemote(examRoom)
    }

  private def parseException(node: JsValue): ExceptionWorkingHours =
    val startDate = ISODateTimeFormat.dateTime().parseDateTime((node \ "startDate").as[String])
    val endDate   = ISODateTimeFormat.dateTime().parseDateTime((node \ "endDate").as[String])
    val hours     = new ExceptionWorkingHours()
    hours.startDate = startDate.toDate
    hours.endDate = endDate.toDate
    hours.outOfService = (node \ "outOfService").asOpt[Boolean].getOrElse(true)
    hours

  def addRoomExceptionHours(body: JsValue): List[ExceptionWorkingHours] =
    val exceptionsNode = (body \ "exceptions").as[JsArray]
    val roomIds        = (body \ "roomIds").as[List[Long]]
    val rooms          = DB.find(classOf[ExamRoom]).where().idIn(roomIds.map(Long.box).asJava).list

    rooms.foreach { room =>
      exceptionsNode.value.foreach { node =>
        val exception = parseException(node)
        exception.startDateTimezoneOffset =
          DateTimeZone.forID(room.localTimezone).getOffset(exception.startDate.getTime)

        exception.endDateTimezoneOffset =
          DateTimeZone.forID(room.localTimezone).getOffset(exception.endDate.getTime)

        exception.room = room
        exception.save()
        room.calendarExceptionEvents.add(exception)
      }
      asyncUpdateRemote(room)
    }

    rooms.flatMap(_.calendarExceptionEvents.asScala)

  def updateExamRoomAccessibility(id: Long, body: JsValue): Either[RoomError, Unit] =
    Option(DB.find(classOf[ExamRoom], id)) match
      case None => Left(RoomNotFound)
      case Some(room) =>
        val ids = (body \ "ids").as[String].split(",").toList.map(_.trim)
        room.accessibilities.clear()
        room.save()

        if ids.nonEmpty && ids.head.nonEmpty then
          ids.foreach { aid =>
            scala.util.Try(aid.toInt).foreach { accessibilityId =>
              Option(DB.find(classOf[Accessibility], accessibilityId)).foreach { accessibility =>
                room.accessibilities.add(accessibility)
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
        room.calendarExceptionEvents.remove(exception)
        updateRemote(room).map(_ => Right(room))
      case _ => Future.successful(Left(ExceptionNotFound))

  def inactivateExamRoom(id: Long): Future[Either[RoomError, ExamRoom]] =
    Option(DB.find(classOf[ExamRoom], id)) match
      case None => Future.successful(Left(RoomNotFound))
      case Some(room) =>
        room.state = ExamRoom.State.INACTIVE.toString
        room.update()

        if Option(room.externalRef).isDefined && examVisitActivated then
          facilityHandler.inactivateFacility(room.id).map(_ => Right(room))
        else Future.successful(Right(room))

  def activateExamRoom(id: Long): Future[Either[RoomError, ExamRoom]] =
    Option(DB.find(classOf[ExamRoom], id)) match
      case None => Future.successful(Left(RoomNotFound))
      case Some(room) =>
        room.state = ExamRoom.State.ACTIVE.toString
        room.update()

        if Option(room.externalRef).isDefined && examVisitActivated then
          facilityHandler.activateFacility(room.id).map(_ => Right(room))
        else Future.successful(Right(room))
