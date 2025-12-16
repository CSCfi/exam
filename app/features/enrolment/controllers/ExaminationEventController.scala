// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.controllers

import features.enrolment.services.{ExaminationEventError, ExaminationEventService}
import io.ebean.text.PathProperties
import database.EbeanJsonExtensions
import models.user.Role
import play.api.mvc._
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import validation.core.{ScalaAttrs, Validators}
import validation.exam.{ExaminationDateValidator, ExaminationEventValidator}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ExaminationEventController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    private val examinationEventService: ExaminationEventService,
    private val validators: Validators,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private def toResult[T](result: Either[ExaminationEventError, T])(onSuccess: T => Result): Result =
    result match
      case Right(value)                             => onSuccess(value)
      case Left(ExaminationEventError.ExamNotFound) => NotFound(ExaminationEventError.ExamNotFound.message)
      case Left(ExaminationEventError.ExaminationDateNotFound) =>
        NotFound(ExaminationEventError.ExaminationDateNotFound.message)
      case Left(ExaminationEventError.EventNotFound)  => NotFound(ExaminationEventError.EventNotFound.message)
      case Left(ExaminationEventError.EventInThePast) => Forbidden(ExaminationEventError.EventInThePast.message)
      case Left(ExaminationEventError.ConflictsWithMaintenancePeriod) =>
        Forbidden(ExaminationEventError.ConflictsWithMaintenancePeriod.message)
      case Left(ExaminationEventError.MaxCapacityExceeded) =>
        Forbidden(ExaminationEventError.MaxCapacityExceeded.message)
      case Left(ExaminationEventError.NoQuitPasswordProvided) =>
        Forbidden(ExaminationEventError.NoQuitPasswordProvided.message)
      case Left(ExaminationEventError.NoSettingsPasswordProvided) =>
        Forbidden(ExaminationEventError.NoSettingsPasswordProvided.message)
      case Left(ExaminationEventError.EventHasEnrolments) =>
        Forbidden(ExaminationEventError.EventHasEnrolments.message)
      case Left(ExaminationEventError.PasswordEncryptionFailed) =>
        InternalServerError(ExaminationEventError.PasswordEncryptionFailed.message)

  def insertExaminationDate(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(validators.validated(ExaminationDateValidator))
      .andThen(audited) { request =>
        val date = request.attrs(ScalaAttrs.DATE)
        toResult(examinationEventService.insertExaminationDate(eid, date))(ed => Ok(ed.asJson))
      }

  def removeExaminationDate(id: Long, edid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      toResult(examinationEventService.removeExaminationDate(edid))(_ => Ok)
    }

  def insertExaminationEvent(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(audited)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(validators.validated(ExaminationEventValidator)) { request =>
        val dto = request.attrs(ScalaAttrs.EXAMINATION_EVENT)
        toResult(examinationEventService.insertExaminationEvent(eid, dto))(eec => Ok(eec.asJson))
      }

  def updateExaminationEvent(eid: Long, eecid: Long): Action[AnyContent] =
    authenticated
      .andThen(audited)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(validators.validated(ExaminationEventValidator)) { request =>
        val dto = request.attrs(ScalaAttrs.EXAMINATION_EVENT)
        toResult(examinationEventService.updateExaminationEvent(eid, eecid, dto))(eec => Ok(eec.asJson))
      }

  def removeExaminationEvent(eid: Long, eeid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      toResult(examinationEventService.removeExaminationEvent(eid, eeid))(_ => Ok)
    }

  def listExaminationEvents(start: Option[String], end: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val pp = PathProperties.parse(
        "(*, exam(*, course(*), examOwners(*)), examinationEvent(*), examEnrolments(*))"
      )
      val configs = examinationEventService.listExaminationEvents(start, end)
      Ok(configs.asJson(pp))
    }

  def listOverlappingExaminationEvents(start: String, duration: Int): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val pp     = PathProperties.parse("(*, examinationEventConfiguration(exam(id, duration)))")
      val events = examinationEventService.listOverlappingExaminationEvents(start, duration)
      Ok(events.asJson(pp))
    }
