// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.controllers

import database.EbeanJsonExtensions
import features.integration.services.ReportAPIService
import play.api.mvc.*
import security.Auth.subjectNotPresent
import security.BlockingIOExecutionContext

import javax.inject.Inject

class ReportAPIController @Inject() (
    private val reportAPIService: ReportAPIService,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def getExamEnrolments(start: Option[String], end: Option[String]): Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      val (participations, pp) = reportAPIService.getExamEnrolments(start, end)
      Ok(participations.asJson(pp))
    }
