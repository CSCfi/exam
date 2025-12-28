// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.controllers

import database.EbeanJsonExtensions
import features.iop.collaboration.services.*
import io.ebean.text.PathProperties
import models.user.Role
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized, subjectNotPresent}
import security.{Auth, BlockingIOExecutionContext}
import services.config.ConfigReader
import services.exam.ExamUpdater
import system.AuditedAction

import javax.inject.Inject

class CollaborativeEnrolmentController @Inject() (
    wsClient: play.api.libs.ws.WSClient,
    examUpdater: ExamUpdater,
    examLoader: CollaborativeExamLoaderService,
    configReader: ConfigReader,
    collaborativeEnrolmentService: CollaborativeEnrolmentService,
    collaborativeExamService: CollaborativeExamService,
    collaborativeExamSearchService: CollaborativeExamSearchService,
    collaborativeExamAuthorizationService: CollaborativeExamAuthorizationService,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    override val controllerComponents: ControllerComponents
)(implicit ec: BlockingIOExecutionContext)
    extends BaseController
    with EbeanJsonExtensions:

  def searchExams(filter: Option[String]): Action[AnyContent] =
    controllerComponents.actionBuilder.andThen(subjectNotPresent).async { _ =>
      val request = collaborativeExamSearchService.buildSearchRequest(filter)
      val homeOrg = configReader.getHomeOrganisationRef

      request.get().flatMap { response =>
        collaborativeExamSearchService.findExamsToProcess(response).map {
          case Left(result) => result
          case Right(items) =>
            val exams = items
              .map { case (ce, rev) => ce.getExam(toJacksonJson(rev)) }
              .filter(e => collaborativeEnrolmentService.isEnrollable(e, homeOrg))
              .toSeq

            val pp = PathProperties.parse(
              """(examOwners(firstName, lastName),
                |examInspections(user(firstName, lastName)),
                |examLanguages(code, name),
                |id, name, periodStart, periodEnd,
                |enrollInstruction, implementation,
                |examinationEventConfigurations
                |)""".stripMargin
            )
            Ok(exams.asJson(pp))
        }
      }
    }

  def checkIfEnrolled(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)

      collaborativeEnrolmentService.checkIfEnrolled(id, user.getId).map {
        case Left(error)       => Forbidden(error)
        case Right(enrolments) => Ok(enrolments.asJson)
      }
    }

  def createEnrolment(id: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(
      authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))
    ).async { request =>
      val user = request.attrs(Auth.ATTR_USER)

      collaborativeEnrolmentService.createEnrolment(id, user.getId).map {
        case Left(error)      => Forbidden(error)
        case Right(enrolment) => Ok(enrolment.asJson)
      }
    }
