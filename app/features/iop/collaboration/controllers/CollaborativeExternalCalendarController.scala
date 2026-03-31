// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.controllers

import database.EbeanJsonExtensions
import features.iop.collaboration.services.CollaborativeExternalCalendarService
import models.user.Role
import play.api.libs.json.{JsArray, JsValue, Json}
import play.api.libs.ws.JsonBodyWritables
import play.api.mvc.*
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.datetime.AppClock
import system.AuditedAction
import validation.calendar.{ExternalReservationDTO, ReservationCreationFilter}
import validation.core.ScalaAttrs

import java.time.format.DateTimeFormatter
import javax.inject.Inject
import scala.concurrent.Future
import scala.util.{Failure, Success, Try}

class CollaborativeExternalCalendarController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    collaborativeExternalCalendarService: CollaborativeExternalCalendarService,
    configReader: ConfigReader,
    clock: AppClock,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions
    with JsonBodyWritables:

  def requestReservation(): Action[JsValue] = audited
    .andThen(authenticated)(parse.json)
    .andThen(authorized(Seq(Role.Name.STUDENT)))
    .andThen(ReservationCreationFilter.forExternal(clock))
    .async { request =>
      if !configReader.isVisitingExaminationSupported then
        Future.successful(Forbidden("Feature not enabled in the installation"))
      else
        val user = request.attrs(Auth.ATTR_USER)

        // Parse request body
        val ExternalReservationDTO(orgRef, roomRef, examId, start, end, sectionIds) =
          request.attrs(ScalaAttrs.ATTR_EXT_RESERVATION)

        Try(parseUrl(orgRef, roomRef)) match
          case Failure(e) =>
            Future.successful(InternalServerError("Failed to parse URL"))
          case Success(url) =>
            val homeOrgRef = configReader.getHomeOrganisationRef
            val body = Json.obj(
              "requestingOrg" -> homeOrgRef,
              "start"         -> DateTimeFormatter.ISO_INSTANT.format(start),
              "end"           -> DateTimeFormatter.ISO_INSTANT.format(end),
              "user"          -> user.eppn,
              "optionalSections" -> JsArray(
                sectionIds.getOrElse(List.empty).map(id => Json.toJson(id))
              )
            )

            collaborativeExternalCalendarService
              .requestExternalReservation(
                examId,
                user.id,
                orgRef,
                roomRef,
                start,
                end,
                sectionIds.getOrElse(Seq.empty),
                body,
                url
              )
              .map {
                case Left(error)          => Forbidden(error)
                case Right(reservationId) => Created(reservationId)
              }
    }

  def requestSlots(
      examId: Long,
      roomRef: String,
      org: Option[String],
      date: Option[String]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      (org, date) match
        case (Some(orgValue), Some(dateValue)) =>
          val user = request.attrs(Auth.ATTR_USER)

          // Parse URL first to get exam period info
          collaborativeExternalCalendarService.findEnrolledExam(examId, user.id).flatMap {
            case None => Future.successful(Forbidden("i18n_error_enrolment_not_found"))
            case Some(_) =>
              collaborativeExternalCalendarService
                .requestExternalSlots(examId, user.id, orgValue, roomRef, dateValue)
                .map {
                  case Left(error)  => Forbidden(error)
                  case Right(slots) => Ok(slots)
                }
          }
        case _ => Future.successful(BadRequest("Missing required parameters"))
    }

  private def parseUrl(orgRef: String, facilityRef: String): java.net.URL =
    java.net.URI
      .create(
        configReader.getIopHost +
          f"/api/organisations/$orgRef/facilities/$facilityRef/reservations"
      )
      .toURL
