// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.collaboration.impl

import impl.CalendarHandler
import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.iop.CollaborativeExam
import models.user.{Role, User}
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.Logging
import play.api.libs.json.{JsArray, JsValue, Json, Writes}
import play.api.libs.ws.{JsonBodyWritables, WSClient}
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}
import validation.scala.calendar.{ExternalReservationDTO, ReservationCreationFilter}
import validation.scala.core.ScalaAttrs

import java.net.{MalformedURLException, URI, URL}
import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*

class CollaborativeExternalCalendarController @Inject() (
    authenticated: AuthenticatedAction,
    calendarHandler: CalendarHandler,
    wsClient: WSClient,
    configReader: ConfigReader,
    dateTimeHandler: DateTimeHandler,
    enrolmentHandler: miscellaneous.enrolment.EnrolmentHandler,
    collaborationController: CollaborationController, // For downloadExam
    val controllerComponents: ControllerComponents,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with DbApiHelper
    with JavaApiHelper
    with JsonBodyWritables
    with Logging:

  def requestReservation(): Action[JsValue] =
    authenticated(parse.json)
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
              val enrolmentOpt = Option(
                DB.find(classOf[ExamEnrolment])
                  .fetch("reservation")
                  .where()
                  .eq("user.id", user.getId)
                  .eq("collaborativeExam.id", examId)
                  .disjunction()
                  .isNull("reservation")
                  .gt("reservation.startAt", now.toDate)
                  .endJunction()
                  .findOne()
              )

              enrolmentOpt match
                case None => Future.successful(NotFound("i18n_error_exam_not_found"))
                case Some(enrolment) =>
                  collaborationController.downloadExam(ce).asScala.flatMap { examOpt =>
                    if examOpt.isEmpty then Future.successful(NotFound("i18n_error_exam_not_found"))
                    else
                      val exam = examOpt.get
                      // Check enrolment validity
                      val oldReservation = enrolment.getReservation
                      val checkResult =
                        if exam.getState == Exam.State.STUDENT_STARTED ||
                          (oldReservation != null && oldReservation.toInterval.isBefore(DateTime.now()))
                        then Some(Forbidden("i18n_reservation_in_effect"))
                        else if oldReservation == null && !enrolmentHandler.isAllowedToParticipate(exam, user) then
                          Some(Forbidden("i18n_no_trials_left"))
                        else None

                      checkResult match
                        case Some(errorResult) => Future.successful(errorResult)
                        case None              =>
                          // Make ext request here
                          val url =
                            try parseUrl(orgRef, roomRef)
                            catch case e: MalformedURLException => throw new RuntimeException(e)

                          val homeOrgRef = configReader.getHomeOrganisationRef
                          val body = Json.obj(
                            "requestingOrg"    -> homeOrgRef,
                            "start"            -> ISODateTimeFormat.dateTime().print(start),
                            "end"              -> ISODateTimeFormat.dateTime().print(end),
                            "user"             -> user.getEppn,
                            "optionalSections" -> JsArray(sectionIds.getOrElse(List.empty).map(id => Json.toJson(id)))
                          )

                          wsClient
                            .url(url.toString)
                            .post(body)
                            .flatMap { response =>
                              val root = response.json
                              if response.status != CREATED then
                                Future.successful(
                                  InternalServerError((root \ "message").asOpt[String].getOrElse("Connection refused"))
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
                                    else InternalServerError("Failed to handle external reservation")
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
              val enrolmentOpt = Option(getEnrolledExam(examId, user))

              enrolmentOpt match
                case None => Future.successful(Forbidden("i18n_error_enrolment_not_found"))
                case Some(_) =>
                  collaborationController.downloadExam(ce).asScala.flatMap { examOpt =>
                    if examOpt.isEmpty then Future.successful(NotFound("i18n_error_exam_not_found"))
                    else
                      val exam = examOpt.get
                      if !exam.hasState(Exam.State.PUBLISHED) then
                        Future.successful(NotFound("i18n_error_exam_not_found"))
                      else
                        // Also, sanity-check the provided search date
                        try
                          calendarHandler.parseSearchDate(dateValue, exam, null)

                          // Ready to shoot
                          val start    = ISODateTimeFormat.dateTime().print(new DateTime(exam.getPeriodStart))
                          val end      = ISODateTimeFormat.dateTime().print(new DateTime(exam.getPeriodEnd))
                          val duration = exam.getDuration
                          val url      = parseUrl(orgValue, roomRef, dateValue, start, end, duration)

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
                              InternalServerError((root \ "message").asOpt[String].getOrElse("Connection refused"))
                            else
                              val slots = calendarHandler.postProcessSlots(root, dateValue, exam, user)
                              Ok(Json.toJson(slots.toSeq))
                          }
                        catch
                          case _: IllegalArgumentException =>
                            Future.successful(NotFound("Invalid date"))
                  }
        case _ => Future.successful(BadRequest("Missing required parameters"))
    }

  private def getEnrolledExam(examId: Long, user: User): ExamEnrolment =
    val now = dateTimeHandler.adjustDST(DateTime.now())
    DB.find(classOf[ExamEnrolment])
      .where()
      .eq("user", user)
      .eq("collaborativeExam.id", examId)
      .disjunction()
      .isNull("reservation")
      .gt("reservation.startAt", now.toDate)
      .endJunction()
      .findOne()

  @throws[MalformedURLException]
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
    try URI.create(url).toURL
    catch case e: MalformedURLException => throw new RuntimeException(e)
