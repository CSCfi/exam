// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.question.controllers

import database.EbeanJsonExtensions
import features.question.services.{TagError, TagService}
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import system.AuditedAction

import javax.inject.Inject

class TagController @Inject() (
    private val tagService: TagService,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private def toResult(error: TagError): Result =
    error match
      case TagError.TagNotFound => NotFound(TagError.TagNotFound.message)

  def listTags(
      filter: Option[String],
      courseIds: Option[List[Long]],
      examIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT))) {
      request =>
        val user       = request.attrs(Auth.ATTR_USER)
        val (tags, pp) = tagService.listTags(user, filter, courseIds, examIds, sectionIds, ownerIds)
        Ok(tags.asJson(pp))
    }

  def addTagToQuestions(): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))(
        parse.json
      ) { request =>
        val questionIds = (request.body \ "questionIds").as[List[Long]]
        val tagId       = (request.body \ "tagId").as[Long]
        tagService.addTagToQuestions(questionIds, tagId) match
          case Left(error) => toResult(error)
          case Right(_)    => Ok
      }
