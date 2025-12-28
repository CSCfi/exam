// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.controllers

import database.EbeanJsonExtensions
import features.facility.services.{ExamMachineError, ExamMachineService}
import models.user.Role
import play.api.libs.json.{JsValue, Json}
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.BlockingIOExecutionContext
import system.AuditedAction

import javax.inject.Inject

class ExamMachineController @Inject() (
    private val examMachineService: ExamMachineService,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private def toResult(error: ExamMachineError): Result =
    error match
      case ExamMachineError.MachineNotFound  => NotFound(ExamMachineError.MachineNotFound.message)
      case ExamMachineError.RoomNotFound     => NotFound(ExamMachineError.RoomNotFound.message)
      case ExamMachineError.SoftwareNotFound => NotFound(ExamMachineError.SoftwareNotFound.message)
      case ExamMachineError.IpAddressConflict(msg)    => Forbidden(msg)
      case ExamMachineError.SoftwareNameConflict(msg) => BadRequest(msg)

  def getExamMachines: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val machines = examMachineService.getExamMachines
      Ok(machines.asJson)
    }

  def getExamMachine(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      examMachineService.getExamMachine(id) match
        case Left(error)          => toResult(error)
        case Right((machine, pp)) => Ok(machine.asJson(pp))
    }

  def getExamMachineReservationsFromNow(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val reservations = examMachineService.getExamMachineReservationsFromNow(id)
      Ok(reservations.asJson)
    }

  def updateExamMachine(id: Long): Action[JsValue] =
    audited.andThen(authenticated)(parse.json).andThen(authorized(Seq(Role.Name.ADMIN))) {
      request =>
        examMachineService.updateExamMachine(id, request.body) match
          case Left(error)          => toResult(error)
          case Right((machine, pp)) => Ok(machine.asJson(pp))
    }

  def resetMachineSoftware(mid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      examMachineService.resetMachineSoftware(mid) match
        case Left(error)          => toResult(error)
        case Right((machine, pp)) => Ok(machine.asJson(pp))
    }

  def updateMachineSoftware(mid: Long, sid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      examMachineService.updateMachineSoftware(mid, sid) match
        case Left(error)       => toResult(error)
        case Right(isTurnedOn) => Ok(Json.obj("turnedOn" -> isTurnedOn))
    }

  def insertExamMachine(id: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      examMachineService.insertExamMachine(id) match
        case Left(error)    => toResult(error)
        case Right(machine) => Ok(machine.asJson)
    }

  def removeExamMachine(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      examMachineService.removeExamMachine(id) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }

  def listSoftware: Action[AnyContent] =
    authenticated { _ =>
      val software = examMachineService.listSoftware
      Ok(software.asJson)
    }

  def getSoftware(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      _ =>
        examMachineService.getSoftware(id) match
          case Left(error)     => toResult(error)
          case Right(software) => Ok(software.asJson)
    }

  def addSoftware(name: String): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      examMachineService.addSoftware(name) match
        case Left(error)     => toResult(error)
        case Right(software) => Ok(software.asJson)
    }

  def updateSoftware(id: Long, name: String): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      examMachineService.updateSoftware(id, name) match
        case Left(error)     => toResult(error)
        case Right(software) => Ok(software.asJson)
    }

  def removeSoftware(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      examMachineService.removeSoftware(id) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }
