// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.question.controllers

import database.EbeanJsonExtensions
import features.question.services.{ExamMaterialError, ExamMaterialService}
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import system.AuditedAction

import javax.inject.Inject

class ExamMaterialController @Inject() (
    private val examMaterialService: ExamMaterialService,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private def toResult(error: ExamMaterialError): Result =
    error match
      case ExamMaterialError.MaterialNotFound =>
        NotFound(ExamMaterialError.MaterialNotFound.message)
      case ExamMaterialError.SectionNotFound => NotFound(ExamMaterialError.SectionNotFound.message)
      case ExamMaterialError.NotAuthorized   => NotFound(ExamMaterialError.NotAuthorized.message)

  def createMaterial(): Action[JsValue] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))(
      parse.json
    ) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val em   = examMaterialService.createMaterial(request.body, user)
      Ok(em.asJson)
    }

  def listMaterials(): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { request =>
      val user            = request.attrs(Auth.ATTR_USER)
      val (materials, pp) = examMaterialService.listMaterials(user)
      Ok(materials.asJson(pp))
    }

  def removeMaterial(materialId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      examMaterialService.removeMaterial(materialId, user) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }

  def updateMaterial(materialId: Long): Action[JsValue] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))(
      parse.json
    ) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      examMaterialService.updateMaterial(materialId, request.body, user) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }

  def addMaterialForSection(sectionId: Long, materialId: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        examMaterialService.addMaterialForSection(sectionId, materialId, user) match
          case Left(error) => toResult(error)
          case Right(_)    => Ok
    }

  def removeMaterialFromSection(sectionId: Long, materialId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      examMaterialService.removeMaterialFromSection(sectionId, materialId, user) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }
