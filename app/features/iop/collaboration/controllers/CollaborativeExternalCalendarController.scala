// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.controllers

import features.iop.collaboration.api.CollaborativeExamLoader
import io.ebean.DB
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.iop.CollaborativeExam
import models.user.{Role, User}
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.Logging
import play.api.libs.json.{JsArray, JsValue, Json}
import play.api.libs.ws.{JsonBodyWritables, WSClient}
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, AuthExecutionContext}
import services.config.ConfigReader
import services.datetime.{CalendarHandler, DateTimeHandler}
import services.enrolment.EnrolmentHandler
import system.AuditedAction
import validation.calendar.{ExternalReservationDTO, ReservationCreationFilter}
import validation.core.ScalaAttrs

import java.net.{URI, URL}
import javax.inject.Inject
import scala.concurrent.Future
import scala.util.{Failure, Success, Try}

class CollaborativeExternalCalendarController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    calendarHandler: CalendarHandler,
    wsClient: WSClient,
    configReader: ConfigReader,
    dateTimeHandler: DateTimeHandler,
    enrolmentHandler: EnrolmentHandler,
    examLoader: CollaborativeExamLoader,
    val controllerComponents: ControllerComponents,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with EbeanQueryExtensions
    with EbeanJsonExtensions
    with JsonBodyWritables
    with Logging:

  def requestReservation(): Action[JsValue] = audited
    .andThen(authenticated)(parse.json)
    .andThen(authorized(Seq(Role.Name.STUDENT)))
    .andThen(ReservationCreationFilter.forExternal())
    .async { request =>
      if !configReader.isVisitingExaminationSupported then
        Future.successful(Forbidden("Feature not enabled in the installation"))
      else
        val user = request.attrs(Auth.ATTR_USER)

        // Parse request body
        val ExternalReservationDTO(orgRef, roomRef, examId, start, end, sectionIds) =
          request.attrs(ScalaAttrs.ATTR_EXT_RESERVATION)
        val now = dateTimeHandler.adjustDST(DateTime.now())

        val ceOpt = Option(DB.find(classOf[CollaborativeExam], examId))
        ceOpt match
          case None => Future.successful(NotFound("i18n_error_exam_not_found"))
          case Some(ce) =>
            val enrolmentOpt =
              DB.find(classOf[ExamEnrolment])
                .fetch("reservation")
                .where()
                .eq("user.id", user.getId)
                .eq("collaborativeExam.id", examId)
                .disjunction()
                .isNull("reservation")
                .gt("reservation.startAt", now.toDate)
                .endJunction()
                .find

            enrolmentOpt match
              case None => Future.successful(NotFound("i18n_error_exam_not_found"))
              case Some(enrolment) =>
                examLoader.downloadExam(ce).flatMap { examOpt =>
                  if examOpt.isEmpty then Future.successful(NotFound("i18n_error_exam_not_found"))
                  else
                    val exam = examOpt.get
                    // Check enrolment validity
                    val oldReservation = enrolment.getReservation
                    val checkResult =
                      if exam.getState == Exam.State.STUDENT_STARTED ||
                        (oldReservation != null && oldReservation.toInterval.isBefore(
                          DateTime.now()
                        ))
                      then Some(Forbidden("i18n_reservation_in_effect"))
                      else if oldReservation == null && !enrolmentHandler.isAllowedToParticipate(
                          exam,
                          user
                        )
                      then
                        Some(Forbidden("i18n_no_trials_left"))
                      else None

                    checkResult match
                      case Some(errorResult) => Future.successful(errorResult)
                      case None              =>
                        // Make ext request here
                        Try(parseUrl(orgRef, roomRef)) match
                          case Failure(e) =>
                            logger.error(s"Failed to parse URL for org=$orgRef, room=$roomRef", e)
                            Future.successful(InternalServerError("Failed to parse URL"))
                          case Success(url) =>
                            val homeOrgRef = configReader.getHomeOrganisationRef
                            val body = Json.obj(
                              "requestingOrg" -> homeOrgRef,
                              "start"         -> ISODateTimeFormat.dateTime().print(start),
                              "end"           -> ISODateTimeFormat.dateTime().print(end),
                              "user"          -> user.getEppn,
                              "optionalSections" -> JsArray(
                                sectionIds.getOrElse(List.empty).map(id => Json.toJson(id))
                              )
                            )

                            wsClient
                              .url(url.toString)
                              .post(body)
                              .flatMap { response =>
                                val root = response.json
                                if response.status != CREATED then
                                  Future.successful(
                                    InternalServerError(
                                      (root \ "message").asOpt[String].getOrElse(
                                        "Connection refused"
                                      )
                                    )
                                  )
                                else
                                  calendarHandler
                                    .handleExternalReservation(
                                      enrolment,
                                      exam,
                                      root,
                                      start,
                                      end,
                                      user,
                                      orgRef,
                                      roomRef,
                                      sectionIds.getOrElse(List.empty)
                                    )
                                    .map { err =>
                                      if err.isEmpty then Created((root \ "id").as[JsValue])
                                      else
                                        InternalServerError("Failed to handle external reservation")
                                    }
                              }
                }
    }

  def requestSlots(
      examId: Long,
      roomRef: String,
      org: Option[String],
      date: Option[String]
  ): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      (org, date) match
        case (Some(orgValue), Some(dateValue)) =>
          val user  = request.attrs(Auth.ATTR_USER)
          val ceOpt = Option(DB.find(classOf[CollaborativeExam], examId))

          ceOpt match
            case None => Future.successful(NotFound("i18n_error_exam_not_found"))
            case Some(ce) =>
              getEnrolledExam(examId, user) match
                case None => Future.successful(Forbidden("i18n_error_enrolment_not_found"))
                case Some(_) =>
                  examLoader.downloadExam(ce).flatMap { examOpt =>
                    if examOpt.isEmpty then Future.successful(NotFound("i18n_error_exam_not_found"))
                    else
                      val exam = examOpt.get
                      if !exam.hasState(Exam.State.PUBLISHED) then
                        Future.successful(NotFound("i18n_error_exam_not_found"))
                      else
                        // Also, sanity-check the provided search date
                        Try(calendarHandler.parseSearchDate(dateValue, exam, null)) match
                          case Failure(_: IllegalArgumentException) =>
                            Future.successful(NotFound("Invalid date"))
                          case Failure(e) =>
                            logger.error(s"Failed to parse search date: $dateValue", e)
                            Future.successful(InternalServerError("Failed to parse date"))
                          case Success(_) =>
                            // Ready to shoot
                            val start =
                              ISODateTimeFormat.dateTime().print(new DateTime(exam.getPeriodStart))
                            val end =
                              ISODateTimeFormat.dateTime().print(new DateTime(exam.getPeriodEnd))
                            val duration = exam.getDuration

                            Try(parseUrl(orgValue, roomRef, dateValue, start, end, duration)) match
                              case Failure(e) =>
                                logger.error("Failed to parse URL for slots", e)
                                Future.successful(InternalServerError("Failed to parse URL"))
                              case Success(url) =>
                                val wsRequest = wsClient
                                  .url(url.toString.split("\\?")(0))
                                  .withQueryStringParameters(
                                    url.getQuery.split("&").map { param =>
                                      val parts = param.split("=")
                                      parts(0) -> parts(1)
                                    }*
                                  )

                                wsRequest.get().map { response =>
                                  val root = response.json
                                  if response.status != OK then
                                    InternalServerError(
                                      (root \ "message").asOpt[String].getOrElse(
                                        "Connection refused"
                                      )
                                    )
                                  else
                                    val slots =
                                      calendarHandler.postProcessSlots(root, dateValue, exam, user)
                                    Ok(Json.toJson(slots.toSeq))
                                }
                  }
        case _ => Future.successful(BadRequest("Missing required parameters"))
    }

  private def getEnrolledExam(examId: Long, user: User): Option[ExamEnrolment] =
    val now = dateTimeHandler.adjustDST(DateTime.now())
    DB.find(classOf[ExamEnrolment])
      .where()
      .eq("user", user)
      .eq("collaborativeExam.id", examId)
      .disjunction()
      .isNull("reservation")
      .gt("reservation.startAt", now.toDate)
      .endJunction()
      .find

  private def parseUrl(orgRef: String, facilityRef: String): URL =
    URI
      .create(
        configReader.getIopHost +
          f"/api/organisations/$orgRef/facilities/$facilityRef/reservations"
      )
      .toURL

  private def parseUrl(
      orgRef: String,
      facilityRef: String,
      date: String,
      start: String,
      end: String,
      duration: Int
  ): URL =
    val url =
      configReader.getIopHost +
        f"/api/organisations/$orgRef/facilities/$facilityRef/slots" +
        f"?date=$date&startAt=$start&endAt=$end&duration=$duration"
    URI.create(url).toURL
