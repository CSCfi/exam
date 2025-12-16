// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.controllers

import features.integration.services.ReportAPIService
import io.ebean.text.PathProperties
import database.EbeanJsonExtensions
import play.api.mvc._
import security.Auth.subjectNotPresent

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ReportAPIController @Inject() (
    private val reportAPIService: ReportAPIService,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def getExamEnrolments(start: Option[String], end: Option[String]): Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      val pp = PathProperties.parse(
        """(id, enrolledOn, noShow,
          |reservation(id,
          |  machine(id, name,
          |    room(name, roomCode)
          |  ),
          |  startAt, endAt,
          |  externalReservation(orgName)
          |),
          |examinationEventConfiguration(
          |  examinationEvent(start)
          |),
          |exam(id,
          |  course(name, code, credits, identifier, courseImplementation,
          |    gradeScale(description, displayName),
          |    organisation(code, name)
          |  ),
          |  softwares(name),
          |  duration,
          |  examType(type),
          |  creditType(type),
          |  executionType(type),
          |  implementation,
          |  trialCount,
          |  answerLanguage,
          |  periodStart,
          |  periodEnd,
          |  examParticipation(started, ended, id)
          |)
          |)""".stripMargin
      )
      val participations = reportAPIService.getExamEnrolments(start, end)
      Ok(participations.asJson(pp))
    }
