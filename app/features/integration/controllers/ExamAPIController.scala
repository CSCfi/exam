// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.controllers

import features.integration.services.ExamAPIService
import io.ebean.text.PathProperties
import database.EbeanJsonExtensions
import play.api.mvc._
import security.Auth.subjectNotPresent

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ExamAPIController @Inject() (
    private val examAPIService: ExamAPIService,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def getActiveExams(date: Option[String]): Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      val pp = PathProperties.parse(
        """(course(name, code, credits,
          |  gradeScale(description, externalRef, displayName),
          |  organisation(code, name, nameAbbreviation)
          |),
          |id, name, periodStart, periodEnd, duration, enrollInstruction,
          |examLanguages(code, name),
          |gradeScale(description, externalRef, displayName),
          |examOwners(firstName, lastName, email),
          |examType(type)
          |)""".stripMargin
      )
      val exams = examAPIService.getActiveExams(date)
      Ok(exams.asJson(pp))
    }
