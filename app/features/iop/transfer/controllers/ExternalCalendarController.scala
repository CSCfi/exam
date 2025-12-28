// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.controllers

import features.iop.transfer.services.ExternalReservationHandlerService
import io.ebean.DB
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.calendar.MaintenancePeriod
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.facility.{ExamMachine, ExamRoom}
import models.user.Role
import org.joda.time._
import org.joda.time.format.ISODateTimeFormat
import play.api.Logging
import play.api.libs.json.{JsValue, Json, Writes}
import play.api.libs.ws.{JsonBodyWritables, WSClient}
import play.api.mvc._
import security.Auth.{AuthenticatedAction, authorized, subjectNotPresent}
import security.{Auth, BlockingIOExecutionContext}
import services.config.ConfigReader
import services.datetime.{CalendarHandler, DateTimeHandler}
import services.mail.EmailComposer
import system.AuditedAction
import validation.calendar.ExternalCalendarReservationValidator

import java.net.{MalformedURLException, URI, URL}
import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters._
import scala.util.Try

class ExternalCalendarController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    wsClient: WSClient,
    calendarHandler: CalendarHandler,
    emailComposer: EmailComposer,
    configReader: ConfigReader,
    dateTimeHandler: DateTimeHandler,
    externalReservationHandler: ExternalReservationHandlerService,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanQueryExtensions
    with EbeanJsonExtensions
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

  def provideReservation(): Action[JsValue] = audited.andThen(subjectNotPresent)(parse.json) {
    request =>
      // Parse request body
      val body           = request.body
      val reservationRef = (body \ "id").as[String]
      val roomRef        = (body \ "roomId").as[String]
      val start    = ISODateTimeFormat.dateTimeParser().parseDateTime((body \ "start").as[String])
      val end      = ISODateTimeFormat.dateTimeParser().parseDateTime((body \ "end").as[String])
      val userEppn = (body \ "user").as[String]
      val orgRef   = (body \ "orgRef").as[String]
      val orgName  = (body \ "orgName").as[String]

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
                parseSearchDate(d, s, e, room) match
                  case None => List.empty[CalendarHandler.TimeSlot]
                  case Some(searchDate) =>
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
              else List.empty

            implicit val timeSlotWrites: Writes[CalendarHandler.TimeSlot] =
              (slot: CalendarHandler.TimeSlot) =>
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
        val dto        = request.attrs(validation.core.ScalaAttrs.ATTR_EXT_RESERVATION)
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
                Try(parseUrl(orgRef, roomRef)).fold(
                  {
                    case e: MalformedURLException =>
                      logger.error("Invalid URL", e)
                      Future.successful(BadRequest("Invalid URL"))
                    case e => throw e
                  },
                  url =>
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
                          val msg = (root \ "message").asOpt[String].getOrElse("Connection refused")
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
                )
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
            val roomRef = reservation.getMachine.getRoom.getExternalRef
            Try(parseUrl(configReader.getHomeOrganisationRef, roomRef, reservation.getExternalRef))
              .fold(
                {
                  case e: MalformedURLException =>
                    logger.error("Invalid URL", e)
                    Future.successful(BadRequest("Invalid URL"))
                  case e => throw e
                },
                url =>
                  wsClient
                    .url(url.toString)
                    .delete()
                    .map { response =>
                      if response.status != OK then
                        val root = response.json.as[play.api.libs.json.JsObject]
                        val msg  = (root \ "message").asOpt[String].getOrElse("Connection refused")
                        InternalServerError(msg)
                      else
                        val msg =
                          request.body.asJson.map(_ \ "msg").flatMap(_.asOpt[String]).getOrElse("")
                        emailComposer.composeExternalReservationCancellationNotification(
                          reservation,
                          Some(msg)
                        )
                        reservation.delete()
                        Ok
                    }
              )
    }

  def requestSlots(
      examId: Long,
      roomRef: String,
      org: Option[String],
      date: Option[String]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      (org, date) match
        case (Some(orgRef), Some(d)) =>
          val user = request.attrs(Auth.ATTR_USER)
          Option(calendarHandler.getEnrolment(examId, user)) match
            case None => Future.successful(Forbidden("i18n_error_enrolment_not_found"))
            case Some(ee) if Option(ee.getCollaborativeExam).isDefined =>
              Future.successful(Forbidden("i18n_error_enrolment_not_found"))
            case Some(ee) =>
              val exam = ee.getExam

              // Sanity-check the provided search date
              calendarHandler.parseSearchDate(d, exam, None) match
                case None => Future.successful(NotFound("Invalid search date"))
                case _    =>
                  // Ready to shoot
                  val start =
                    ISODateTimeFormat.dateTime().print(new DateTime(exam.getPeriodStart))
                  val end      = ISODateTimeFormat.dateTime().print(new DateTime(exam.getPeriodEnd))
                  val duration = exam.getDuration
                  Try(parseUrl(orgRef, roomRef, d, start, end, duration)).fold(
                    {
                      case e: MalformedURLException =>
                        logger.error("Invalid URL", e)
                        Future.successful(BadRequest("Invalid URL"))
                      case e => throw e
                    },
                    url =>
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
                            val msg =
                              (root \ "message").asOpt[String].getOrElse("Connection refused")
                            InternalServerError(msg)
                          else
                            val root  = response.json
                            val slots = calendarHandler.postProcessSlots(root, d, exam, user)
                            Ok(Json.toJson(slots))
                        }
                  )
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

  private def parseSearchDate(
      day: String,
      startDate: String,
      endDate: String,
      room: ExamRoom
  ): Option[LocalDate] =
    val windowSize = calendarHandler.getReservationWindowSize
    val offset = Option(room)
      .map(r => DateTimeZone.forID(r.getLocalTimezone).getOffset(DateTime.now()))
      .getOrElse(configReader.getDefaultTimeZone.getOffset(DateTime.now()))

    val now                   = DateTime.now().plusMillis(offset).toLocalDate
    val reservationWindowDate = now.plusDays(windowSize)
    val examEndDate = DateTime
      .parse(endDate, ISODateTimeFormat.dateTimeParser())
      .plusMillis(offset)
      .toLocalDate
    val searchEndDate =
      if reservationWindowDate.isBefore(examEndDate) then reservationWindowDate else examEndDate

    val examStartDate = DateTime
      .parse(startDate, ISODateTimeFormat.dateTimeParser())
      .plusMillis(offset)
      .toLocalDate

    val initialDate =
      if day.isEmpty then now else LocalDate.parse(day, ISODateTimeFormat.dateParser())
    val weekStart = initialDate.withDayOfWeek(1)
    val afterNow  = if weekStart.isBefore(now) then now else weekStart

    // if searching for month(s) after exam's end month -> no can do
    if afterNow.isAfter(searchEndDate) then
      None
    else
      // Do not execute search before exam starts
      val searchDate = if afterNow.isBefore(examStartDate) then examStartDate else afterNow
      Some(searchDate)

  private def getEndSearchDate(endDate: String, searchDate: LocalDate): LocalDate =
    val examEnd = LocalDate.parse(endDate, ISODateTimeFormat.dateTimeParser())
    calendarHandler.getEndSearchDate(searchDate, examEnd)

  private def isReservedDuring(machine: ExamMachine, interval: Interval): Boolean =
    machine.getReservations.asScala.exists(r => interval.overlaps(r.toInterval))
