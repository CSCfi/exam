// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.controllers

import features.assessment.services.QuestionReviewService
import system.interceptors.AnonymousHandler
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.Json
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.interceptors.AnonymousJsonFilter

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class QuestionReviewController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    val anonymous: AnonymousJsonFilter,
    private val questionReviewService: QuestionReviewService,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions
    with AnonymousHandler:

  def listEssays(examId: Long, ids: Option[List[Long]]): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.TEACHER)))
    .andThen(anonymous(Set("user", "creator", "modifier"))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      questionReviewService.findExam(examId) match
        case Some(exam) if exam.isInspectedOrCreatedOrOwnedBy(user) =>
          val results = questionReviewService.listEssays(exam, user, ids)
          writeAnonymousResult(request, Ok(Json.toJson(results)), exam.isAnonymous)
        case _ => BadRequest
    }
