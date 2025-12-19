// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.controllers

import features.assessment.services.{ExamInspectionError, ExamInspectionService}
import system.interceptors.AnonymousHandler
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import validation.assessment.CommentValidator
import validation.core.{ScalaAttrs, Validators}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ExamInspectionController @Inject() (
    val controllerComponents: ControllerComponents,
    val validators: Validators,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    private val examInspectionService: ExamInspectionService,
    implicit val ec: ExecutionContext
) extends BaseController
    with AnonymousHandler
    with EbeanJsonExtensions:

  def addInspection(eid: Long, uid: Long): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
    .andThen(validators.validated(CommentValidator))
    .andThen(audited) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val result =
        for
          exam      <- examInspectionService.findExam(eid)
          recipient <- examInspectionService.findUser(uid)
          _ <-
            if !user.isAdminOrSupport && !exam.isOwnedOrCreatedBy(user) then
              Left(ExamInspectionError.AccessForbidden)
            else if examInspectionService.isInspectorOf(recipient, exam) then
              Left(ExamInspectionError.AlreadyInspector)
            else
              val commentText = request.attrs.get(ScalaAttrs.COMMENT)
              if Option(exam.getName).map(_.isEmpty).isEmpty && commentText.isDefined then
                Left(ExamInspectionError.ExamNameMissing)
              else Right(())
          inspection = examInspectionService.addInspection(
            exam,
            recipient,
            user,
            request.attrs.get(ScalaAttrs.COMMENT)
          )
        yield inspection

      result match
        case Right(inspection) => Ok(inspection.asJson)
        case Left(ExamInspectionError.AccessForbidden) =>
          Forbidden(ExamInspectionError.AccessForbidden.message)
        case Left(ExamInspectionError.AlreadyInspector) =>
          Forbidden(ExamInspectionError.AlreadyInspector.message)
        case Left(ExamInspectionError.ExamNameMissing) =>
          BadRequest(ExamInspectionError.ExamNameMissing.message)
        case Left(ExamInspectionError.UserNotFound) | Left(ExamInspectionError.ExamNotFound) =>
          NotFound
        case Left(_) => NotFound
    }

  def setOutcome(id: Long): Action[JsValue] =
    Action
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(audited)(parse.json) { request =>
        val ready = (request.body \ "ready").asOpt[Boolean].getOrElse(false)
        examInspectionService.setOutcome(id, ready) match
          case Right(_) => Ok
          case Left(ExamInspectionError.InspectionNotFound) =>
            NotFound(ExamInspectionError.InspectionNotFound.message)
          case Left(_) => NotFound
      }

  def listInspections(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val inspections = examInspectionService.listInspections(id)
      Ok(inspections.asJson)
    }

  def deleteInspection(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      examInspectionService.deleteInspection(id) match
        case Right(_) => Ok
        case Left(ExamInspectionError.InspectionNotFound) =>
          NotFound(ExamInspectionError.InspectionNotFound.message)
        case Left(_) => NotFound
    }
