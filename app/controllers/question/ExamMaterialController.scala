// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.question

import impl.SectionQuestionHandler
import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.sections.{ExamMaterial, ExamSection}
import models.user.{Role, User}
import play.api.Logging
import play.api.libs.json.*
import play.api.mvc.*
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

class ExamMaterialController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with SectionQuestionHandler
    with DbApiHelper
    with JavaApiHelper
    with Logging:

  private def parseFromBody(body: JsValue): ExamMaterial =
    val em = new ExamMaterial()
    em.setName((body \ "name").as[String])
    (body \ "author").asOpt[String].foreach(em.setAuthor)
    (body \ "isbn").asOpt[String].foreach(em.setIsbn)
    em

  def createMaterial(): Action[JsValue] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))(parse.json) { request =>
      val em   = parseFromBody(request.body)
      val user = request.attrs(Auth.ATTR_USER)
      em.setCreatorWithDate(user)
      em.setModifierWithDate(user)
      em.save()
      Ok(em.asJson)
    }

  def listMaterials(): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val materials = DB
        .find(classOf[ExamMaterial])
        .where()
        .eq("creator", user)
        .distinct
      Ok(materials.asJson(PathProperties.parse("(*)")))
    }

  def removeMaterial(materialId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      Option(DB.find(classOf[ExamMaterial], materialId)) match
        case None                                    => NotFound
        case Some(em) if !em.getCreator.equals(user) => NotFound
        case Some(_) =>
          DB.delete(classOf[ExamMaterial], materialId)
          Ok
    }

  def updateMaterial(materialId: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))(parse.json) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      Option(DB.find(classOf[ExamMaterial], materialId)) match
        case None                                      => NotFound
        case Some(dst) if !dst.getCreator.equals(user) => NotFound
        case Some(dst) =>
          val src = parseFromBody(request.body)
          // Copy properties manually (Scala alternative to BeanUtils.copyProperties)
          dst.setName(src.getName)
          Option(src.getAuthor).foreach(dst.setAuthor)
          Option(src.getIsbn).foreach(dst.setIsbn)
          dst.update()
          Ok
    }

  private def getSection(sectionId: Long, user: User): Option[ExamSection] =
    DB.find(classOf[ExamSection])
      .where()
      .idEq(sectionId)
      .eq("exam.examOwners", user)
      .find

  private def getOwnershipError(em: ExamMaterial, user: User): Option[Result] =
    if em == null || !em.getCreator.equals(user) then Some(NotFound)
    else None

  def addMaterialForSection(sectionId: Long, materialId: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      Option(DB.find(classOf[ExamMaterial], materialId)) match
        case None => NotFound
        case Some(em) =>
          getOwnershipError(em, user) match
            case Some(error) => error
            case None =>
              getSection(sectionId, user) match
                case None => NotFound
                case Some(es) =>
                  es.getExamMaterials.add(em)
                  es.update()
                  Ok
    }

  def removeMaterialFromSection(sectionId: Long, materialId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      Option(DB.find(classOf[ExamMaterial], materialId)) match
        case None => NotFound
        case Some(em) =>
          getOwnershipError(em, user) match
            case Some(error) => error
            case None =>
              getSection(sectionId, user) match
                case None => NotFound
                case Some(es) =>
                  es.getExamMaterials.remove(em)
                  es.update()
                  Ok
    }
