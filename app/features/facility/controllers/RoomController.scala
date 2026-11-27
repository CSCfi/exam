// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.controllers

import database.EbeanJsonExtensions
import features.facility.services.{RoomError, RoomService}
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import system.AuditedAction
import system.interceptors.SensitiveDataFilter

import javax.inject.Inject

class RoomController @Inject() (
    private val roomService: RoomService,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val sensitiveDataFilter: SensitiveDataFilter,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private def toResult(error: RoomError): Result =
    error match
      case RoomError.RoomNotFound            => NotFound(RoomError.RoomNotFound.message)
      case RoomError.AddressNotFound         => NotFound(RoomError.AddressNotFound.message)
      case RoomError.WorkingHoursNotFound    => Forbidden(RoomError.WorkingHoursNotFound.message)
      case RoomError.ExceptionNotFound       => NotFound(RoomError.ExceptionNotFound.message)
      case RoomError.FacilityIdRequired      => BadRequest(RoomError.FacilityIdRequired.message)
      case RoomError.FacilityNotFound        => NotFound(RoomError.FacilityNotFound.message)
      case RoomError.InvalidPassword         => Forbidden(RoomError.InvalidPassword.message)
      case RoomError.InvalidFacilityPassword => Forbidden(RoomError.InvalidFacilityPassword.message)

  def getExamRooms: Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(
        Role.Name.TEACHER,
        Role.Name.SUPPORT,
        Role.Name.ADMIN,
        Role.Name.STUDENT
      )))
      .andThen(sensitiveDataFilter(Set("internalPassword", "externalPassword"))) { request =>
        val user           = request.attrs(Auth.ATTR_USER)
        val (rooms, props) = roomService.getExamRooms(user)
        Ok(rooms.asJson(props))
      }

  def getExamRoom(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      roomService.getExamRoom(id) match
        case Left(error)              => toResult(error)
        case Right((examRoom, props)) => Ok(examRoom.asJson(props))
    }

  def createExamRoomDraft: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val examRoom = roomService.createExamRoomDraft
      Ok(examRoom.asJson)
    }

  def validatePassword(roomId: Long): Action[JsValue] =
    audited.andThen(authenticated)(parse.json).andThen(authorized(Seq(
      Role.Name.ADMIN,
      Role.Name.STUDENT
    ))) { request =>
      roomService.validatePassword(roomId, request.body) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }

  def updateExamRoom(id: Long): Action[JsValue] =
    audited.andThen(authenticated)(parse.json).andThen(authorized(Seq(Role.Name.ADMIN))).async {
      request =>
        roomService.updateExamRoom(id, request.body).map {
          case Left(error) => toResult(error)
          case Right(_)    => Ok
        }
    }

  def updateExamRoomAddress(id: Long): Action[JsValue] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN)))(parse.json).async {
      request =>
        roomService.updateExamRoomAddress(id, request.body).map {
          case Left(error) => toResult(error)
          case Right(_)    => Ok
        }
    }

  def updateExamRoomWorkingHours(): Action[JsValue] =
    authenticated(parse.json).andThen(authorized(Seq(Role.Name.ADMIN))) { request =>
      val id = roomService.updateExamRoomWorkingHours(request.body)
      Ok(play.api.libs.json.Json.obj("id" -> id))
    }

  def removeExamRoomWorkingHours(roomId: Long, id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      roomService.removeExamRoomWorkingHours(roomId, id) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }

  def updateExamStartingHours(): Action[JsValue] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN)))(parse.json) {
      request =>
        roomService.updateExamStartingHours(request.body)
        Ok
    }

  def addRoomExceptionHours(): Action[JsValue] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN)))(parse.json) {
      request =>
        val exceptions = roomService.addRoomExceptionHours(request.body)
        Ok(exceptions.asJson)
    }

  def updateExamRoomAccessibility(id: Long): Action[JsValue] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN)))(parse.json) {
      request =>
        roomService.updateExamRoomAccessibility(id, request.body) match
          case Left(error) => toResult(error)
          case Right(_)    => Ok
    }

  def removeRoomExceptionHour(roomId: Long, exceptionId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      roomService.removeRoomExceptionHour(roomId, exceptionId).map {
        case Left(error) => toResult(error)
        case Right(_)    => Ok
      }
    }

  def inactivateExamRoom(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      roomService.inactivateExamRoom(id).map {
        case Left(error) => toResult(error)
        case Right(room) => Ok(room.asJson)
      }
    }

  def activateExamRoom(id: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      roomService.activateExamRoom(id).map {
        case Left(error) => toResult(error)
        case Right(room) => Ok(room.asJson)
      }
    }
