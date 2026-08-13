// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.controllers

import database.EbeanJsonExtensions
import features.integration.services.ExamRecordAPIService
import play.api.mvc.*
import security.Auth.subjectNotPresent
import security.BlockingIOExecutionContext

import javax.inject.Inject

class ExamRecordAPIController @Inject() (
    private val examRecordAPIService: ExamRecordAPIService,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def getNewRecords(startDate: String): Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      val scores = examRecordAPIService.getNewRecords(startDate)
      Ok(scores.asJson)
    }
