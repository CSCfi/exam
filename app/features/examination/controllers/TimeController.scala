// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.controllers

import features.examination.services.{TimeError, TimeService}
import models.user.Role
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}

import javax.inject.Inject

class TimeController @Inject() (
    private val timeService: TimeService,
    val authenticated: AuthenticatedAction,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController:

  private def toResult(error: TimeError): Result =
    error match
      case TimeError.EnrolmentNotFound => NotFound

  def getRemainingExamTime(hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      timeService.getRemainingExamTime(hash, user) match
        case Left(error)    => toResult(error)
        case Right(seconds) => Ok(seconds.toString)
    }
