// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.controllers

import features.examination.services.ExaminationService.getPath
import features.examination.services.{
  ExternalExaminationError,
  ExternalExaminationService,
  RequestData
}
import io.ebean.text.PathProperties
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.JsValue
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import system.interceptors.{SecureController, SensitiveDataFilter}
import validation.answer.{ClozeTestAnswerValidator, EssayAnswerValidator}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ExternalExaminationController @Inject() (
    private val externalExaminationService: ExternalExaminationService,
    override val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val sensitiveDataFilter: SensitiveDataFilter,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends SecureController
    with EbeanJsonExtensions:

  override protected def sensitiveFields: Set[String] =
    Set("score", "defaultScore", "correctOption", "configKey")

  private def extractRequestData(request: RequestHeader): RequestData =
    RequestData(
      remoteAddress = request.remoteAddress,
      headers = request.headers.toMap,
      uri = request.uri,
      host = request.host
    )

  private def toResult(error: ExternalExaminationError): Result =
    error match
      case ExternalExaminationError.ExternalExamNotFound  => Forbidden
      case ExternalExaminationError.EnrolmentNotFound     => Forbidden
      case ExternalExaminationError.QuestionNotFound      => Forbidden
      case ExternalExaminationError.DeserializationFailed => InternalServerError
      case ExternalExaminationError.SerializationFailed   => InternalServerError
      case ExternalExaminationError.ValidationFailed      => Forbidden
      case ExternalExaminationError.VersionConflict => Forbidden("i18n_error_data_has_changed")
      case ExternalExaminationError.ValidationError(message) => Forbidden(message)

  def startExam(hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      externalExaminationService.startExam(hash, user, extractRequestData(request)).map {
        case Left(error) => toResult(error)
        case Right(exam) => Ok(exam.asJson(getPath(false)))
      }
    }

  def turnExam(hash: String): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      externalExaminationService.turnExam(hash, user) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }

  def abortExam(hash: String): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      externalExaminationService.abortExam(hash, user) match
        case Left(error) => toResult(error)
        case Right(_)    => Ok
    }

  def answerMultiChoice(hash: String, qid: Long): Action[JsValue] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))).async(parse.json) {
      request =>
        val user      = request.attrs(Auth.ATTR_USER)
        val optionIds = (request.body \ "oids").asOpt[Seq[Long]].getOrElse(Seq.empty)
        externalExaminationService.answerMultiChoice(
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

  def answerEssay(hash: String, qid: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(EssayAnswerValidator.filter)
      .async(parse.json) { request =>
        val user      = request.attrs(Auth.ATTR_USER)
        val answerDTO = request.attrs(EssayAnswerValidator.ESSAY_ANSWER_KEY)
        externalExaminationService.answerEssay(
          hash,
          qid,
          user,
          answerDTO,
          extractRequestData(request)
        ).map {
          case Left(error)   => toResult(error)
          case Right(answer) => Ok(answer.asJson)
        }
      }

  def answerClozeTest(hash: String, qid: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(ClozeTestAnswerValidator.filter)
      .async(parse.json) { request =>
        val user      = request.attrs(Auth.ATTR_USER)
        val answerDTO = request.attrs(ClozeTestAnswerValidator.CLOZE_TEST_ANSWER_KEY)
        externalExaminationService.answerClozeTest(
          hash,
          qid,
          user,
          answerDTO,
          extractRequestData(request)
        ).map {
          case Left(error) => toResult(error)
          case Right(answer) =>
            Ok(answer.asJson(PathProperties.parse("(id, objectVersion, answer)")))
        }
      }
