// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.controllers

import database.EbeanJsonExtensions
import features.assessment.services.ExamAnswerService
import models.user.Role
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import system.interceptors.{SecureController, SensitiveDataFilter}

import javax.inject.Inject

class ExamAnswerController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    val sensitiveDataFilter: SensitiveDataFilter,
    private val examAnswerService: ExamAnswerService,
    implicit val ec: BlockingIOExecutionContext
) extends SecureController
    with EbeanJsonExtensions:

  override protected val sensitiveFields =
    Set("score", "defaultScore", "correctOption", "claimChoiceType", "configKey")

  def listAnswers(eid: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      examAnswerService.findExamForUser(eid, user) match
        case Some(exam) if examAnswerService.canReleaseAnswers(exam) =>
          val preparedExam = examAnswerService.prepareExamForAnswerRelease(exam, user)
          Ok(preparedExam.asJson)
        case _ => Ok
    }
