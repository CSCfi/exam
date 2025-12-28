// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.controllers

import database.EbeanJsonExtensions
import features.assessment.services.QuestionReviewService
import models.user.Role
import play.api.libs.json.Json
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import system.interceptors.{AnonymousHandler, AnonymousJsonFilter}

import javax.inject.Inject

class QuestionReviewController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    val anonymous: AnonymousJsonFilter,
    private val questionReviewService: QuestionReviewService,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions
    with AnonymousHandler:

  def listEssays(examId: Long, ids: Option[List[Long]]): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .andThen(anonymous(Set("user", "creator", "modifier"))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      questionReviewService.findExam(examId) match
        case Some(exam) if exam.isInspectedOrCreatedOrOwnedBy(user) =>
          val results = questionReviewService.listEssays(exam, user, ids)
          writeAnonymousResult(request, Ok(Json.toJson(results)), exam.isAnonymous)
        case _ => BadRequest
    }
