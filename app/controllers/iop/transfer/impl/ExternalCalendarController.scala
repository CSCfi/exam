// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl

import controllers.iop.transfer.api.ExternalReservationHandler
import impl.CalendarHandler
import impl.mail.EmailComposer
import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.calendar.MaintenancePeriod
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.facility.{ExamMachine, ExamRoom}
import models.user.Role
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, DateTimeZone, Interval, LocalDate}
import play.api.Logging
import play.api.libs.json.{JsValue, Json, Writes}
import play.api.libs.ws.{JsonBodyWritables, WSClient}
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized, subjectNotPresent}
import security.scala.{Auth, AuthExecutionContext}
import system.AuditedAction
import validation.scala.calendar.ExternalCalendarReservationValidator

import java.net.{MalformedURLException, URI, URL}
import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*

class ExternalCalendarController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    wsClient: WSClient,
    calendarHandler: CalendarHandler,
    emailComposer: EmailComposer,
    configReader: ConfigReader,
    dateTimeHandler: DateTimeHandler,
    externalReservationHandler: ExternalReservationHandler,
    val controllerComponents: ControllerComponents,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with DbApiHelper
    with JavaApiHelper
    with JsonBodyWritables
    with Logging:

  private def parseUrl(
      orgRef: String,
      facilityRef: String,
      date: String,
      start: String,
      end: String,
      duration: Int
  ): URL =
    val url = configReader.getIopHost +
      s"/api/organisations/$orgRef/facilities/$facilityRef/slots" +
      s"?date=$date&startAt=$start&endAt=$end&duration=$duration"
    URI.create(url).toURL

  private def parseUrl(orgRef: String, facilityRef: String): URL =
    URI
      .create(
        configReader.getIopHost +
          s"/api/organisations/$orgRef/facilities/$facilityRef/reservations"
      )
      .toURL

  private def parseUrl(orgRef: String, facilityRef: String, reservationRef: String): URL =
    URI
      .create(
        configReader.getIopHost +
          s"/api/organisations/$orgRef/facilities/$facilityRef/reservations/$reservationRef/force"
      )
      .toURL

  // Actions invoked by central IOP server

  def provideReservation(): Action[JsValue] = audited.andThen(subjectNotPresent)(parse.json) { request =>
    // Parse request body
    val body           = request.body
    val reservationRef = (body \ "id").as[String]
    val roomRef        = (body \ "roomId").as[String]
    val start          = ISODateTimeFormat.dateTimeParser().parseDateTime((body \ "start").as[String])
    val end            = ISODateTimeFormat.dateTimeParser().parseDateTime((body \ "end").as[String])
    val userEppn       = (body \ "user").as[String]
    val orgRef         = (body \ "orgRef").as[String]
    val orgName        = (body \ "orgName").as[String]

    if start.isBeforeNow || end.isBefore(start) then BadRequest("invalid dates")
    else
      DB.find(classOf[ExamRoom]).where().eq("externalRef", roomRef).find match
        case None => NotFound("room not found")
        case Some(room) =>
          calendarHandler.getRandomMachine(room, null, start, end, Seq.empty) match
            case None          => Forbidden("i18n_no_machines_available")
            case Some(machine) =>
              // We are good to go :)
              val reservation = new Reservation()
              reservation.setExternalRef(reservationRef)
              reservation.setEndAt(end)
              reservation.setStartAt(start)
              reservation.setMachine(machine)
              reservation.setExternalUserRef(userEppn)
              reservation.setExternalOrgRef(orgRef)
              reservation.setExternalOrgName(orgName)
              reservation.save()

              Created(asJson(reservation))
  }

  // Initiated by originator of reservation (the student)
  def acknowledgeReservationRemoval(ref: String): Action[AnyContent] = Action { _ =>
    DB.find(classOf[Reservation])
      .fetch("machine")
      .fetch("machine.room")
      .fetch("enrolment")
      .where()
      .eq("externalRef", ref)
      .find match
      case None => NotFound("reservation not found")
      case Some(reservation) =>
        val now = dateTimeHandler.adjustDST(DateTime.now(), reservation)
        if reservation.toInterval.isBefore(now) || reservation.toInterval.contains(now) then
          Forbidden("i18n_reservation_in_effect")
        else
          Option(reservation.getEnrolment) match
            case Some(enrolment) => enrolment.delete() // cascades to reservation
            case None            => reservation.delete()
          Ok
  }

  // Initiated by administrator of organization where reservation takes place
  def acknowledgeReservationRevocation(ref: String): Action[AnyContent] = Action { _ =>
    DB.find(classOf[ExamEnrolment])
      .fetch("reservation")
      .fetch("reservation.externalReservation")
      .fetch("reservation.machine")
      .fetch("reservation.machine.room")
      .where()
      .eq("reservation.externalRef", ref)
      .find match
      case None => NotFound(f"No reservation with ref $ref.")
      case Some(enrolment) =>
        val reservation = enrolment.getReservation
        val now         = dateTimeHandler.adjustDST(DateTime.now(), reservation)
        if reservation.toInterval.isBefore(now) || reservation.toInterval.contains(now) then
          Forbidden("i18n_reservation_in_effect")
        else
          enrolment.setReservation(null)
          enrolment.update()
          reservation.delete()
          Ok
  }

  def provideSlots(
      roomId: Option[String],
      date: Option[String],
      start: Option[String],
      end: Option[String],
      duration: Option[Int]
  ): Action[AnyContent] = Action { _ =>
    (roomId, date, start, end, duration) match
      case (Some(rid), Some(d), Some(s), Some(e), Some(dur)) =>
        DB.find(classOf[ExamRoom]).where().eq("externalRef", rid).find match
          case None => Forbidden(f"No room with ref: ($rid)")
          case Some(room) =>
            val slots =
              if !room.getOutOfService && room.getState != ExamRoom.State.INACTIVE.toString then
                try
                  val searchDate = parseSearchDate(d, s, e, room)
                  val machines = DB
                    .find(classOf[ExamMachine])
                    .where()
                    .eq("room.id", room.getId)
                    .ne("outOfService", true)
                    .ne("archived", true)
                    .list

                  // Maintenance periods
                  val periods = DB
                    .find(classOf[MaintenancePeriod])
                    .where()
                    .gt("endsAt", searchDate.toDate)
                    .list
                    .map(p =>
                      new Interval(
                        calendarHandler.normalizeMaintenanceTime(p.getStartsAt),
                        calendarHandler.normalizeMaintenanceTime(p.getEndsAt)
                      )
                    )

                  val endOfSearch = getEndSearchDate(e, searchDate)

                  Iterator
                    .iterate(searchDate)(_.plusDays(1))
                    .takeWhile(!_.isAfter(endOfSearch))
                    .flatMap { date =>
                      getExamSlots(room, dur, date, machines, periods)
                    }
                    .toList
                catch case _: IllegalArgumentException => List.empty
              else List.empty

            implicit val timeSlotWrites: Writes[CalendarHandler.TimeSlot] = (slot: CalendarHandler.TimeSlot) =>
              Json.obj(
                "start"             -> slot.start,
                "end"               -> slot.end,
                "availableMachines" -> slot.availableMachines,
                "ownReservation"    -> slot.ownReservation,
                "conflictingExam"   -> slot.conflictingExam
              )

            Ok(Json.toJson(slots))
      case _ => BadRequest("Missing required parameters")
  }

  // Actions invoked directly by logged-in users
  def requestReservation(): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.STUDENT)))
    .andThen(ExternalCalendarReservationValidator.filter)
    .async(parse.json) { request =>
      if !configReader.isVisitingExaminationSupported then
        Future.successful(Forbidden("Feature not enabled in the installation"))
      else
        val user       = request.attrs(Auth.ATTR_USER)
        val dto        = request.attrs(validation.scala.core.ScalaAttrs.ATTR_EXT_RESERVATION)
        val orgRef     = dto.orgRef
        val roomRef    = dto.roomRef
        val start      = dto.start
        val end        = dto.end
        val examId     = dto.examId
        val sectionIds = dto.sectionIds

        val now = dateTimeHandler.adjustDST(DateTime.now())
        val enrolmentOpt =
          DB.find(classOf[ExamEnrolment])
            .fetch("reservation")
            .fetch("exam.examSections")
            .fetch("exam.examSections.examMaterials")
            .where()
            .eq("user.id", user.getId)
            .eq("exam.id", examId)
            .eq("exam.state", Exam.State.PUBLISHED)
            .disjunction()
            .isNull("reservation")
            .gt("reservation.startAt", now.toDate)
            .endJunction()
            .find

        enrolmentOpt match
          case None => Future.successful(Forbidden("i18n_error_enrolment_not_found"))
          case Some(enrolment) =>
            val sectionIdsSeq = sectionIds.getOrElse(List.empty)
            calendarHandler.checkEnrolment(enrolment, user, sectionIdsSeq) match
              case Some(errorResult) => Future.successful(errorResult)
              case None              =>
                // Let's do this
                try
                  val url        = parseUrl(orgRef, roomRef)
                  val homeOrgRef = configReader.getHomeOrganisationRef
                  val body = Json.obj(
                    "requestingOrg"    -> homeOrgRef,
                    "start"            -> ISODateTimeFormat.dateTime().print(start),
                    "end"              -> ISODateTimeFormat.dateTime().print(end),
                    "user"             -> user.getEppn,
                    "optionalSections" -> Json.toJson(sectionIdsSeq)
                  )

                  for
                    response <- wsClient.url(url.toString).post(body)
                    result <-
                      if response.status != CREATED then
                        val root = response.json.as[play.api.libs.json.JsObject]
                        val msg  = (root \ "message").asOpt[String].getOrElse("Connection refused")
                        Future.successful(InternalServerError(msg))
                      else
                        val root = response.json
                        calendarHandler
                          .handleExternalReservation(
                            enrolment,
                            enrolment.getExam,
                            root,
                            start,
                            end,
                            user,
                            orgRef,
                            roomRef,
                            sectionIdsSeq
                          )
                          .map {
                            case Some(_) => InternalServerError("Internal server error")
                            case None    => Created((root \ "id").get)
                          }
                  yield result
                catch
                  case e: MalformedURLException =>
                    logger.error("Invalid URL", e)
                    Future.successful(BadRequest("Invalid URL"))
    }

  def requestReservationRemoval(ref: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      DB.find(classOf[Reservation]).where().eq("externalRef", ref).find match
        case None => Future.successful(NotFound(f"No reservation with ref $ref."))
        case Some(reservation) =>
          externalReservationHandler.removeReservation(reservation, user, "").map(_ => Ok)
    }

  def requestReservationRevocation(ref: String): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))).async { request =>
      val reservationOpt =
        DB.find(classOf[Reservation])
          .where()
          .isNotNull("machine")
          .eq("externalRef", ref)
          .isNull("enrolment")
          .find

      reservationOpt match
        case None => Future.successful(NotFound(f"No reservation with ref $ref."))
        case Some(reservation) =>
          val now = dateTimeHandler.adjustDST(DateTime.now(), reservation)
          if reservation.toInterval.isBefore(now) || reservation.toInterval.contains(now) then
            Future.successful(Forbidden("i18n_reservation_in_effect"))
          else
            try
              val roomRef = reservation.getMachine.getRoom.getExternalRef
              val url     = parseUrl(configReader.getHomeOrganisationRef, roomRef, reservation.getExternalRef)

              wsClient
                .url(url.toString)
                .delete()
                .map { response =>
                  if response.status != OK then
                    val root = response.json.as[play.api.libs.json.JsObject]
                    val msg  = (root \ "message").asOpt[String].getOrElse("Connection refused")
                    InternalServerError(msg)
                  else
                    val msg = request.body.asJson.map(_ \ "msg").flatMap(_.asOpt[String]).getOrElse("")
                    emailComposer.composeExternalReservationCancellationNotification(reservation, Some(msg))
                    reservation.delete()
                    Ok
                }
            catch
              case e: MalformedURLException =>
                logger.error("Invalid URL", e)
                Future.successful(BadRequest("Invalid URL"))
    }

  def requestSlots(examId: Long, roomRef: String, org: Option[String], date: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      (org, date) match
        case (Some(orgRef), Some(d)) =>
          val user = request.attrs(Auth.ATTR_USER)
          Option(calendarHandler.getEnrolment(examId, user)) match
            case None => Future.successful(Forbidden("i18n_error_enrolment_not_found"))
            case Some(ee) if ee.getCollaborativeExam != null =>
              Future.successful(Forbidden("i18n_error_enrolment_not_found"))
            case Some(ee) =>
              val exam = ee.getExam

              // Sanity-check the provided search date
              val isValidDate =
                try
                  calendarHandler.parseSearchDate(d, exam, None)
                  true
                catch case _: IllegalArgumentException => false

              if !isValidDate then Future.successful(NotFound("Invalid search date"))
              else
                // Ready to shoot
                try
                  val start    = ISODateTimeFormat.dateTime().print(new DateTime(exam.getPeriodStart))
                  val end      = ISODateTimeFormat.dateTime().print(new DateTime(exam.getPeriodEnd))
                  val duration = exam.getDuration
                  val url      = parseUrl(orgRef, roomRef, d, start, end, duration)

                  wsClient
                    .url(url.toString.split("\\?")(0))
                    .withQueryStringParameters(url.getQuery.split("&").map { kv =>
                      val parts = kv.split("=")
                      parts(0) -> parts(1)
                    }*)
                    .get()
                    .map { response =>
                      if response.status != OK then
                        val root = response.json.as[play.api.libs.json.JsObject]
                        val msg  = (root \ "message").asOpt[String].getOrElse("Connection refused")
                        InternalServerError(msg)
                      else
                        val root  = response.json
                        val slots = calendarHandler.postProcessSlots(root, d, exam, user)
                        Ok(Json.toJson(slots))
                    }
                catch
                  case e: MalformedURLException =>
                    logger.error("Invalid URL", e)
                    Future.successful(BadRequest("Invalid URL"))
        case _ => Future.successful(BadRequest("Missing required parameters"))
    }

  // Helpers

  private def getExamSlots(
      room: ExamRoom,
      examDuration: Int,
      date: LocalDate,
      machines: List[ExamMachine],
      maintenances: List[Interval]
  ): Set[CalendarHandler.TimeSlot] =
    val examSlots = calendarHandler
      .gatherSuitableSlots(room, date, examDuration)
      .filterNot(slot => maintenances.exists(_.overlaps(slot)))

    // Check machine availability for each slot
    examSlots.map { slot =>
      val availableMachineCount = machines.count(m => !isReservedDuring(m, slot))
      CalendarHandler.TimeSlot(slot, availableMachineCount, null)
    }.toSet

  private def parseSearchDate(day: String, startDate: String, endDate: String, room: ExamRoom): LocalDate =
    val windowSize = calendarHandler.getReservationWindowSize
    val offset =
      if room != null then DateTimeZone.forID(room.getLocalTimezone).getOffset(DateTime.now())
      else configReader.getDefaultTimeZone.getOffset(DateTime.now())

    val now                   = DateTime.now().plusMillis(offset).toLocalDate
    val reservationWindowDate = now.plusDays(windowSize)
    val examEndDate = DateTime
      .parse(endDate, ISODateTimeFormat.dateTimeParser())
      .plusMillis(offset)
      .toLocalDate
    val searchEndDate = if reservationWindowDate.isBefore(examEndDate) then reservationWindowDate else examEndDate

    val examStartDate = DateTime
      .parse(startDate, ISODateTimeFormat.dateTimeParser())
      .plusMillis(offset)
      .toLocalDate

    var searchDate = if day.isEmpty then now else LocalDate.parse(day, ISODateTimeFormat.dateParser())
    searchDate = searchDate.withDayOfWeek(1)

    if searchDate.isBefore(now) then searchDate = now

    // if searching for month(s) after exam's end month -> no can do
    if searchDate.isAfter(searchEndDate) then throw new IllegalArgumentException("Search date is after exam end date")

    // Do not execute search before exam starts
    if searchDate.isBefore(examStartDate) then searchDate = examStartDate

    searchDate

  private def getEndSearchDate(endDate: String, searchDate: LocalDate): LocalDate =
    val examEnd = LocalDate.parse(endDate, ISODateTimeFormat.dateTimeParser())
    calendarHandler.getEndSearchDate(searchDate, examEnd)

  private def isReservedDuring(machine: ExamMachine, interval: Interval): Boolean =
    machine.getReservations.asScala.exists(r => interval.overlaps(r.toInterval))
