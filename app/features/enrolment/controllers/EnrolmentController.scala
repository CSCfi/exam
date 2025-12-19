// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.controllers

import features.enrolment.services.{EnrolmentError, EnrolmentService}
import database.EbeanJsonExtensions
import models.user.Role
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import validation.core.{ScalaAttrs, Validators}
import validation.enrolment.{
  EnrolmentCourseInformationValidator,
  EnrolmentInformationValidator,
  StudentEnrolmentValidator
}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class EnrolmentController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    private val enrolmentService: EnrolmentService,
    private val validators: Validators,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def listEnrolledExams(code: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      Ok(enrolmentService.listEnrolledExams(code).asJson)
    }

  def enrolmentsByReservation(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Ok(enrolmentService.enrolmentsByReservation(id).asJson)
    }

  def getEnrolledExamInfo(code: String, id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      enrolmentService.getEnrolledExamInfo(code, id) match
        case Some(exam) => Ok(exam.asJson)
        case None       => NotFound("i18n_error_exam_not_found")
    }

  def checkIfEnrolled(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      enrolmentService.checkIfEnrolled(id, user) match
        case Right(enrolments)                 => Ok(enrolments.asJson)
        case Left(EnrolmentError.NoTrialsLeft) => Unauthorized(EnrolmentError.NoTrialsLeft.message)
        case Left(EnrolmentError.InvalidEnrolment(msg)) => BadRequest(msg)
        case Left(_)                                    => BadRequest
    }

  def removeEnrolment(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      enrolmentService.removeEnrolment(id, user) match
        case Right(_) => Ok
        case Left(EnrolmentError.EnrolmentNotFound) =>
          NotFound(EnrolmentError.EnrolmentNotFound.message)
        case Left(EnrolmentError.PrivateExam) => Forbidden(EnrolmentError.PrivateExam.message)
        case Left(EnrolmentError.CancelReservationFirst) =>
          Forbidden(EnrolmentError.CancelReservationFirst.message)
        case Left(_) => Forbidden
    }

  def updateEnrolment(id: Long): Action[AnyContent] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.STUDENT)))
    .andThen(validators.validated(EnrolmentInformationValidator)) { request =>
      val info = request.attrs.get(ScalaAttrs.ENROLMENT_INFORMATION)
      val user = request.attrs(Auth.ATTR_USER)
      enrolmentService.updateEnrolment(id, user, info) match
        case Right(_) => Ok
        case Left(EnrolmentError.EnrolmentNotFound) =>
          NotFound(EnrolmentError.EnrolmentNotFound.message)
        case Left(_) => Forbidden
    }

  def createEnrolment(id: Long): Action[AnyContent] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT)))
    .andThen(validators.validated(EnrolmentCourseInformationValidator))
    .async { request =>
      val code = request.attrs(ScalaAttrs.COURSE_CODE)
      val user = request.attrs(Auth.ATTR_USER)
      enrolmentService.createEnrolment(
        id,
        models.exam.ExamExecutionType.Type.PUBLIC,
        user,
        Some(code)
      ).map {
        case Right(enrolment)                  => Ok(enrolment.asJson)
        case Left(EnrolmentError.ExamNotFound) => NotFound(EnrolmentError.ExamNotFound.message)
        case Left(EnrolmentError.EnrolmentExists) =>
          Forbidden(EnrolmentError.EnrolmentExists.message)
        case Left(EnrolmentError.ReservationInEffect) =>
          Forbidden(EnrolmentError.ReservationInEffect.message)
        case Left(EnrolmentError.AssessmentNotReceived) =>
          Forbidden(EnrolmentError.AssessmentNotReceived.message)
        case Left(EnrolmentError.AccessForbidden) =>
          Forbidden(EnrolmentError.AccessForbidden.message)
        case Left(EnrolmentError.MultipleFutureReservations) =>
          InternalServerError(EnrolmentError.MultipleFutureReservations.message)
        case Left(EnrolmentError.MultipleFutureEvents) =>
          InternalServerError(EnrolmentError.MultipleFutureEvents.message)
        case Left(error) => Forbidden(error.message)
      }
    }

  def createStudentEnrolment(eid: Long): Action[AnyContent] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))
    .andThen(validators.validated(StudentEnrolmentValidator))
    .async { request =>
      val uid    = request.attrs.get(ScalaAttrs.USER_ID)
      val email  = request.attrs.get(ScalaAttrs.EMAIL)
      val sender = request.attrs(Auth.ATTR_USER)
      enrolmentService.createStudentEnrolment(eid, uid, email, sender).map {
        case Right(enrolment)                  => Ok(enrolment.asJson)
        case Left(EnrolmentError.ExamNotFound) => NotFound(EnrolmentError.ExamNotFound.message)
        case Left(EnrolmentError.UserNotFoundOrAlreadyEnrolled) =>
          BadRequest(EnrolmentError.UserNotFoundOrAlreadyEnrolled.message)
        case Left(error) => Forbidden(error.message)
      }
    }

  def removeStudentEnrolment(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      enrolmentService.removeStudentEnrolment(id, user) match
        case Right(_) => Ok
        case Left(EnrolmentError.NotPossibleToRemoveParticipant) =>
          Forbidden(EnrolmentError.NotPossibleToRemoveParticipant.message)
        case Left(_) => Forbidden
    }

  def getRoomInfoFromEnrolment(hash: String): Action[AnyContent] =
    authenticated.async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      enrolmentService.getRoomInfoFromEnrolment(hash, user).map {
        case None       => NotFound(EnrolmentError.RoomNotFound.message)
        case Some(room) => Ok(room.asJson)
      }
    }

  def addExaminationEventConfig(enrolmentId: Long, configId: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        enrolmentService.addExaminationEventConfig(enrolmentId, configId, user) match
          case Right(_) => Ok
          case Left(EnrolmentError.EnrolmentNotFound) =>
            NotFound(EnrolmentError.EnrolmentNotFound.message)
          case Left(EnrolmentError.ConfigNotFound) =>
            NotFound(EnrolmentError.ConfigNotFound.message)
          case Left(EnrolmentError.MaxEnrolmentsReached) =>
            Forbidden(EnrolmentError.MaxEnrolmentsReached.message)
          case Left(_) => Forbidden
    }

  def removeExaminationEventConfig(enrolmentId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      enrolmentService.removeExaminationEventConfig(enrolmentId, user) match
        case Right(_) => Ok
        case Left(EnrolmentError.EnrolmentNotFound) =>
          NotFound(EnrolmentError.EnrolmentNotFound.message)
        case Left(_) => Forbidden
    }

  def removeExaminationEvent(configId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      enrolmentService.removeExaminationEvent(configId) match
        case Right(_) => Ok
        case Left(EnrolmentError.ConfigNotFound) =>
          BadRequest(EnrolmentError.ConfigNotFound.message)
        case Left(EnrolmentError.EventInPast) => Forbidden(EnrolmentError.EventInPast.message)
        case Left(_)                          => Forbidden
    }

  def permitRetrial(id: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(
      Role.Name.TEACHER,
      Role.Name.ADMIN,
      Role.Name.SUPPORT
    ))) {
      _ =>
        enrolmentService.permitRetrial(id) match
          case Right(_)                               => Ok
          case Left(EnrolmentError.EnrolmentNotFound) => NotFound("i18n_not_found")
          case Left(_)                                => Forbidden
    }
