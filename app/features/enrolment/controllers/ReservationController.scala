// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.controllers

import features.enrolment.services.{ReservationError, ReservationService}
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.{JsValue, Json}
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ReservationController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    private val reservationService: ReservationService,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def getExams(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      Ok(reservationService.getExams(filter, user).asJson)
    }

  def getExamRooms: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Ok(reservationService.getExamRooms.asJson)
    }

  def getStudents(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT))) { _ =>
      Ok(reservationService.getStudents(filter))
    }

  def getTeachers(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Ok(reservationService.getTeachers(filter))
    }

  def removeReservation(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { request =>
      val message = request.body.asFormUrlEncoded.flatMap(_.get("msg").flatMap(_.headOption))
      reservationService.removeReservation(id, message).map {
        case Right(_) => Ok
        case Left(ReservationError.ReservationNotFound) =>
          NotFound(s"${ReservationError.ReservationNotFound.message} $id")
        case Left(ReservationError.ParticipationExists) =>
          Forbidden(ReservationError.ParticipationExists.message)
        case Left(_) => Forbidden
      }
    }

  def findAvailableMachines(reservationId: Long, roomId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))).async { _ =>
      reservationService.findAvailableMachines(reservationId, roomId).map {
        case Right(machines)                            => Ok(Json.toJson(machines))
        case Left(ReservationError.ReservationNotFound) => NotFound("Reservation not found")
        case Left(ReservationError.RoomNotFound)        => NotFound("Room not found")
        case Left(ReservationError.ExamNotFound)        => NotFound("Exam not found")
        case Left(_)                                    => NotFound
      }
    }

  def updateMachine(reservationId: Long): Action[JsValue] =
    audited.andThen(authenticated)(parse.json).andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))).async {
      request =>
        val machineId = (request.body \ "machineId").as[Long]
        reservationService.updateMachine(reservationId, machineId).map {
          case Right(reservation)                         => Ok(reservation.asJson)
          case Left(ReservationError.ReservationNotFound) => NotFound("Reservation not found")
          case Left(ReservationError.MachineNotFound)     => NotFound("Machine not found")
          case Left(ReservationError.ExamNotFound)        => NotFound("Exam not found")
          case Left(ReservationError.MachineNotEligible) =>
            Forbidden(ReservationError.MachineNotEligible.message)
          case Left(ReservationError.SuitableSlotNotFound) =>
            InternalServerError(ReservationError.SuitableSlotNotFound.message)
          case Left(_) => Forbidden
        }
    }

  def listExaminationEvents(
      state: Option[String],
      ownerId: Option[Long],
      studentId: Option[Long],
      examId: Option[Long],
      start: Option[String],
      end: Option[String]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) { request =>
      val user       = request.attrs(Auth.ATTR_USER)
      val enrolments = reservationService.listExaminationEvents(state, ownerId, studentId, examId, start, end, user)
      Ok(enrolments.asJson)
    }

  def listReservations(
      state: Option[String],
      ownerId: Option[Long],
      studentId: Option[Long],
      roomId: Option[Long],
      machineId: Option[Long],
      examId: Option[Long],
      start: Option[String],
      end: Option[String],
      externalRef: Option[String]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val reservations = reservationService.listReservations(
        state,
        ownerId,
        studentId,
        roomId,
        machineId,
        examId,
        start,
        end,
        externalRef,
        user
      )
      Ok(reservations.asJson)
    }
