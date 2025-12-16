// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.controllers

import features.integration.services.ExamRecordAPIService
import database.EbeanJsonExtensions
import play.api.mvc._
import security.Auth.subjectNotPresent

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ExamRecordAPIController @Inject() (
    private val examRecordAPIService: ExamRecordAPIService,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def getNewRecords(startDate: String): Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      val scores = examRecordAPIService.getNewRecords(startDate)
      Ok(scores.asJson)
    }
