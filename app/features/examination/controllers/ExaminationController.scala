// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.controllers

import features.examination.services.ExaminationService.getPath
import features.examination.services.{ExaminationError, ExaminationService, RequestData}
import io.ebean.text.PathProperties
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import system.interceptors.{ExamActionRouter, SecureController, SensitiveDataFilter}
import validation.answer.{ClozeTestAnswerValidator, EssayAnswerValidator}

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

class ExaminationController @Inject() (
    private val examinationService: ExaminationService,
    examActionRouter: ExamActionRouter,
    override val authenticated: AuthenticatedAction,
    audited: AuditedAction,
    val sensitiveDataFilter: SensitiveDataFilter,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends SecureController
    with EbeanJsonExtensions:

  override protected def sensitiveFields: Set[String] =
    Set("score", "defaultScore", "correctOption", "claimChoiceType", "configKey")

  private def extractRequestData(request: RequestHeader): RequestData =
    RequestData(
      remoteAddress = request.remoteAddress,
      headers = request.headers.toMap,
      uri = request.uri,
      host = request.host
    )

  private def toResult(error: ExaminationError): Result =
    error match
      case ExaminationError.ExamNotFound          => NotFound("i18n_error_exam_not_found")
      case ExaminationError.QuestionNotFound      => Forbidden("Question not found")
      case ExaminationError.EnrolmentNotFound     => Forbidden("Enrolment not found")
      case ExaminationError.ParticipationNotFound => Forbidden("Participation not found")
      case ExaminationError.ReservationNotFound   => Forbidden("i18n_reservation_not_found")
      case ExaminationError.ReservationMachineNotFound =>
        Forbidden("i18n_reservation_machine_not_found")
      case ExaminationError.RoomNotFound             => NotFound("Room not found")
      case ExaminationError.InvalidExamState         => Forbidden("Invalid exam state")
      case ExaminationError.WrongExamMachine         => Forbidden("i18n_wrong_exam_machine")
      case ExaminationError.FailedToCreateExam       => InternalServerError("Failed to create exam")
      case ExaminationError.ValidationError(message) => Forbidden(message)

  def startExam(hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).andThen(examActionRouter).async {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        examinationService.prepareExam(hash, user, extractRequestData(request)).map {
          case Left(error) => toResult(error)
          case Right(exam) => Ok(exam.asJson(getPath(false)))
        }
    }

  def initializeExam(hash: String): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))).andThen(
      examActionRouter
    ).async {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        examinationService.initializeExam(hash, user, extractRequestData(request)).map {
          case Left(error) => toResult(error)
          case Right(_)    => Ok
        }
    }

  def turnExam(hash: String): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      Future.successful(
        examinationService.turnExam(hash, user, extractRequestData(request)) match
          case Left(error) => toResult(error)
          case Right((exam, ep)) =>
            val session = request.session - "ongoingExamHash"
            Ok.withSession(session)
      )
    }

  def abortExam(hash: String): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      Future.successful(
        examinationService.abortExam(hash, user, extractRequestData(request)) match
          case Left(error) => toResult(error)
          case Right((exam, ep)) =>
            val session = request.session - "ongoingExamHash"
            Ok.withSession(session)
      )
    }

  def answerEssay(hash: String, questionId: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(EssayAnswerValidator.filter)
      .async(parse.json) { request =>
        val user      = request.attrs(Auth.ATTR_USER)
        val answerDTO = request.attrs(EssayAnswerValidator.ESSAY_ANSWER_KEY)
        examinationService.answerEssay(
          hash,
          questionId,
          user,
          answerDTO,
          extractRequestData(request)
        ).map {
          case Left(error)   => toResult(error)
          case Right(answer) => Ok(answer.asJson)
        }
      }

  def answerMultiChoice(hash: String, qid: Long): Action[JsValue] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))).async(parse.json) {
      request =>
        val user      = request.attrs(Auth.ATTR_USER)
        val optionIds = (request.body \ "oids").asOpt[Seq[Long]].getOrElse(Seq.empty)
        examinationService.answerMultiChoice(
          hash,
          qid,
          user,
          optionIds,
          extractRequestData(request)
        ).map {
          case Left(error) => toResult(error)
          case Right(_)    => Ok
        }
    }

  def answerClozeTest(hash: String, questionId: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(ClozeTestAnswerValidator.filter)
      .async(parse.json) { request =>
        val user      = request.attrs(Auth.ATTR_USER)
        val answerDTO = request.attrs(ClozeTestAnswerValidator.CLOZE_TEST_ANSWER_KEY)
        examinationService.answerClozeTest(
          hash,
          questionId,
          user,
          answerDTO,
          extractRequestData(request)
        ).map {
          case Left(error) => toResult(error)
          case Right(answer) =>
            Ok(answer.asJson(PathProperties.parse("(id, objectVersion, answer)")))
        }
      }
