// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.controllers

import features.assessment.services.{LanguageInspectionError, LanguageInspectionService}
import database.EbeanJsonExtensions
import models.user.Permission.Type
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import security.{CombinedRoleAndPermissionFilter, PermissionFilter}
import system.AuditedAction
import validation.assessment.CommentValidator
import validation.core.{ScalaAttrs, Validators}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class LanguageInspectionController @Inject() (
    val controllerComponents: ControllerComponents,
    val validators: Validators,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    private val languageInspectionService: LanguageInspectionService,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def listInspections(month: Option[String], start: Option[Long], end: Option[Long]): Action[AnyContent] =
    authenticated.andThen(CombinedRoleAndPermissionFilter.anyMatch(Type.CAN_INSPECT_LANGUAGE, Role.Name.ADMIN)) { _ =>
      val inspections = languageInspectionService.listInspections(month, start, end)
      Ok(inspections.asJson)
    }

  def createInspection(): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)).andThen(audited))(
        parse.json
      ) { request =>
        val examId = (request.body \ "examId").as[Long]
        val user   = request.attrs(Auth.ATTR_USER)
        languageInspectionService.createInspection(examId, user) match
          case Right(_)                                   => Ok
          case Left(LanguageInspectionError.ExamNotFound) => BadRequest(LanguageInspectionError.ExamNotFound.message)
          case Left(LanguageInspectionError.AlreadySentForInspection) =>
            Forbidden(LanguageInspectionError.AlreadySentForInspection.message)
          case Left(LanguageInspectionError.NotAllowedForLanguageInspection) =>
            Forbidden(LanguageInspectionError.NotAllowedForLanguageInspection.message)
          case Left(_) => Forbidden
      }

  def assignInspection(id: Long): Action[AnyContent] =
    authenticated.andThen(PermissionFilter(Type.CAN_INSPECT_LANGUAGE)) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      languageInspectionService.assignInspection(id, user) match
        case Right(_) => Ok
        case Left(LanguageInspectionError.InspectionNotFound) =>
          NotFound(LanguageInspectionError.InspectionNotFound.message)
        case Left(LanguageInspectionError.AlreadyAssigned) =>
          Forbidden(LanguageInspectionError.AlreadyAssigned.message)
        case Left(_) => Forbidden
    }

  def setApproval(id: Long): Action[JsValue] =
    authenticated.andThen(PermissionFilter(Type.CAN_INSPECT_LANGUAGE))(parse.json).andThen(audited) { request =>
      (request.body \ "approved").asOpt[Boolean] match
        case Some(approval) =>
          val user = request.attrs(Auth.ATTR_USER)
          languageInspectionService.setApproval(id, approval, user) match
            case Right(_) => Ok
            case Left(LanguageInspectionError.InspectionNotFound) =>
              NotFound(LanguageInspectionError.InspectionNotFound.message)
            case Left(LanguageInspectionError.NotAssigned) =>
              Forbidden(LanguageInspectionError.NotAssigned.message)
            case Left(LanguageInspectionError.AlreadyFinalized) =>
              Forbidden(LanguageInspectionError.AlreadyFinalized.message)
            case Left(LanguageInspectionError.NoStatementGiven) =>
              Forbidden(LanguageInspectionError.NoStatementGiven.message)
            case Left(_) => Forbidden
        case None => BadRequest
    }

  def setStatement(id: Long): Action[AnyContent] = authenticated
    .andThen(PermissionFilter(Type.CAN_INSPECT_LANGUAGE))
    .andThen(validators.validated(CommentValidator))
    .andThen(audited) { request =>
      request.attrs.get(ScalaAttrs.COMMENT) match
        case Some(comment) =>
          val user = request.attrs(Auth.ATTR_USER)
          languageInspectionService.setStatement(id, comment, user) match
            case Right(inspection) => Ok(inspection.asJson)
            case Left(LanguageInspectionError.InspectionNotFound) =>
              NotFound(LanguageInspectionError.InspectionNotFound.message)
            case Left(LanguageInspectionError.NotAssigned) =>
              Forbidden(LanguageInspectionError.NotAssigned.message)
            case Left(LanguageInspectionError.AlreadyFinalized) =>
              Forbidden(LanguageInspectionError.AlreadyFinalized.message)
            case Left(_) => Forbidden
        case None => BadRequest("No comment given")
    }
