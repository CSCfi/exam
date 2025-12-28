// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.controllers

import features.iop.collaboration.services.CollaborativeCalendarService
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc._
import security.Auth.{AuthenticatedAction, authorized}
import security.Auth
import security.BlockingIOExecutionContext
import system.AuditedAction
import validation.calendar.{ReservationCreationFilter, ReservationDTO}
import validation.core.ScalaAttrs

import javax.inject.Inject

class CollaborativeCalendarController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    collaborativeCalendarService: CollaborativeCalendarService,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def getExamInfo(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { _ =>
      collaborativeCalendarService.getExamInfo(id).map {
        case None       => NotFound("i18n_error_exam_not_found")
        case Some(exam) => Ok(exam.asJson)
      }
    }

  def createReservation(): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.STUDENT)))
    .andThen(ReservationCreationFilter())
    .async(parse.json) { request =>
      val ReservationDTO(roomId, examId, start, end, aids, sectionIds) =
        request.attrs(ScalaAttrs.ATTR_STUDENT_RESERVATION)
      val user = request.attrs(Auth.ATTR_USER)

      collaborativeCalendarService
        .createReservation(
          examId,
          roomId,
          user.getId,
          start,
          end,
          aids.getOrElse(Seq.empty),
          sectionIds.getOrElse(Seq.empty)
        )
        .map {
          case Left(error)                     => Forbidden(error)
          case Right((enrolment, reservation)) => Ok
        }
    }

  def getSlots(
      examId: Long,
      roomId: Long,
      day: String,
      aids: Option[Seq[Long]]
  ): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)

      collaborativeCalendarService
        .getSlots(examId, roomId, day, aids, user.getId)
        .map {
          case Left(error) => Forbidden(error)
          case Right(json) => Ok(json)
        }
    }
