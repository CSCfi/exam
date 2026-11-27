// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.question.services

import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.text.PathProperties
import models.sections.{ExamMaterial, ExamSection}
import models.user.User
import play.api.libs.json.JsValue
import services.exam.SectionQuestionHandler

import javax.inject.Inject

class ExamMaterialService @Inject() () extends SectionQuestionHandler with EbeanQueryExtensions:

  private def parseFromBody(body: JsValue): ExamMaterial =
    val em = new ExamMaterial()
    em.name = (body \ "name").as[String]
    (body \ "author").asOpt[String].foreach(v => em.author = v)
    (body \ "isbn").asOpt[String].foreach(v => em.isbn = v)
    em

  def createMaterial(body: JsValue, user: User): ExamMaterial =
    val em = parseFromBody(body)
    em.setCreatorWithDate(user)
    em.setModifierWithDate(user)
    em.save()
    em

  def listMaterials(user: User): (List[ExamMaterial], PathProperties) =
    val materials = DB
      .find(classOf[ExamMaterial])
      .where()
      .eq("creator", user)
      .distinct
      .toList
    val pp = PathProperties.parse("(*)")
    (materials, pp)

  def removeMaterial(materialId: Long, user: User): Either[ExamMaterialError, Unit] =
    Option(DB.find(classOf[ExamMaterial], materialId)) match
      case None                                 => Left(ExamMaterialError.MaterialNotFound)
      case Some(em) if !em.creator.equals(user) => Left(ExamMaterialError.NotAuthorized)
      case Some(_) =>
        DB.delete(classOf[ExamMaterial], materialId)
        Right(())

  def updateMaterial(materialId: Long, body: JsValue, user: User): Either[ExamMaterialError, Unit] =
    Option(DB.find(classOf[ExamMaterial], materialId)) match
      case None                                   => Left(ExamMaterialError.MaterialNotFound)
      case Some(dst) if !dst.creator.equals(user) => Left(ExamMaterialError.NotAuthorized)
      case Some(dst) =>
        val src = parseFromBody(body)
        // Copy properties manually (Scala alternative to BeanUtils.copyProperties)
        dst.name = src.name
        Option(src.author).foreach(v => dst.author = v)
        Option(src.isbn).foreach(v => dst.isbn = v)
        dst.update()
        Right(())

  private def getSection(sectionId: Long, user: User): Option[ExamSection] =
    DB.find(classOf[ExamSection])
      .where()
      .idEq(sectionId)
      .eq("exam.examOwners", user)
      .find

  private def getOwnershipError(em: ExamMaterial, user: User): Option[ExamMaterialError] =
    if Option(em).isEmpty || !em.creator.equals(user) then Some(ExamMaterialError.NotAuthorized)
    else None

  def addMaterialForSection(
      sectionId: Long,
      materialId: Long,
      user: User
  ): Either[ExamMaterialError, Unit] =
    Option(DB.find(classOf[ExamMaterial], materialId)) match
      case None => Left(ExamMaterialError.MaterialNotFound)
      case Some(em) =>
        getOwnershipError(em, user) match
          case Some(error) => Left(error)
          case None =>
            getSection(sectionId, user) match
              case None => Left(ExamMaterialError.SectionNotFound)
              case Some(es) =>
                es.examMaterials.add(em)
                es.update()
                Right(())

  def removeMaterialFromSection(
      sectionId: Long,
      materialId: Long,
      user: User
  ): Either[ExamMaterialError, Unit] =
    Option(DB.find(classOf[ExamMaterial], materialId)) match
      case None => Left(ExamMaterialError.MaterialNotFound)
      case Some(em) =>
        getOwnershipError(em, user) match
          case Some(error) => Left(error)
          case None =>
            getSection(sectionId, user) match
              case None => Left(ExamMaterialError.SectionNotFound)
              case Some(es) =>
                es.examMaterials.remove(em)
                es.update()
                Right(())
