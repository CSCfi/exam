// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.calendar.controllers

import features.calendar.services.{CalendarError, CalendarService}
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import validation.calendar.ReservationCreationFilter
import validation.core.ScalaAttrs

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class CalendarController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    private val calendarService: CalendarService,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def removeReservation(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      calendarService.removeReservation(id, user) match
        case Right(_) => Ok
        case Left(CalendarError.ReservationInEffect) =>
          Forbidden(CalendarError.ReservationInEffect.message)
        case Left(CalendarError.InvalidReservation(_)) => NotFound
        case Left(_)                                   => Forbidden
    }

  def getCurrentEnrolment(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        calendarService.getCurrentEnrolment(id, user) match
          case Some(enrolment) => Ok(enrolment.asJson)
          case None            => Ok
    }

  def createReservation(): Action[JsValue] = audited
    .andThen(authenticated)(parse.json)
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT)))
    .andThen(ReservationCreationFilter())
    .async { request =>
      val dto  = request.attrs(ScalaAttrs.ATTR_STUDENT_RESERVATION)
      val user = request.attrs(Auth.ATTR_USER)
      calendarService.createReservation(dto, user).map {
        case Right(_) => Ok
        case Left(CalendarError.EnrolmentNotFound) =>
          Forbidden(CalendarError.EnrolmentNotFound.message)
        case Left(CalendarError.NoMachinesAvailable) =>
          Forbidden(CalendarError.NoMachinesAvailable.message)
        case Left(CalendarError.Forbidden) => Forbidden
        case Left(CalendarError.NotFound)  => NotFound
        case Left(error)                   => Forbidden(error.message)
      }
    }

  def getSlots(
      examId: Long,
      roomId: Long,
      day: String,
      aids: Option[Seq[Long]]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      calendarService.getSlots(examId, roomId, day, aids, user) match
        case Right(json) => Ok(json)
        case Left(CalendarError.EnrolmentNotFound) =>
          Forbidden(CalendarError.EnrolmentNotFound.message)
        case Left(_) => Forbidden
    }
