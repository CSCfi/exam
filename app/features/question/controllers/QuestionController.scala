// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.question.controllers

import features.question.services.{QuestionError, QuestionService}
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.Files.TemporaryFile
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import validation.core.Validators
import validation.question.QuestionTextValidator

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.util.Using

class QuestionController @Inject() (
    private val questionService: QuestionService,
    private val validators: Validators,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private val questionTextSanitizer = validators.validated(QuestionTextValidator)

  private def toResult(error: QuestionError): Result =
    error match
      case QuestionError.QuestionNotFound => NotFound(QuestionError.QuestionNotFound.message)
      case QuestionError.AccessForbidden  => Forbidden(QuestionError.AccessForbidden.message)
      case QuestionError.UserNotFound     => NotFound(QuestionError.UserNotFound.message)
      case QuestionError.InvalidRequest   => BadRequest(QuestionError.InvalidRequest.message)
      case QuestionError.QuestionInUse    => Forbidden(QuestionError.QuestionInUse.message)
      case QuestionError.FileNotFound     => BadRequest(QuestionError.FileNotFound.message)
      case QuestionError.ValidationError  => BadRequest(QuestionError.ValidationError.message)
      case QuestionError.ValidationErrorWithMessage(message) => BadRequest(message)

  def getQuestions(
      examIds: List[Long],
      courseIds: List[Long],
      tagIds: List[Long],
      sectionIds: List[Long],
      ownerIds: List[Long]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        val (questions, pp) =
          questionService.getQuestions(user, examIds, courseIds, tagIds, sectionIds, ownerIds)
        Ok(questions.asJson(pp))
    }

  def getQuestion(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        questionService.getQuestion(id, user) match
          case Left(error)           => toResult(error)
          case Right((question, pp)) => Ok(question.asJson(pp))
    }

  def copyQuestion(id: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(
      Role.Name.TEACHER,
      Role.Name.ADMIN,
      Role.Name.SUPPORT
    ))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        questionService.copyQuestion(id, user) match
          case Left(error) => toResult(error)
          case Right(copy) => Ok(copy.asJson)
    }

  def createQuestion(): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(questionTextSanitizer)(parse.json) { request =>
        val user         = request.attrs(Auth.ATTR_USER)
        val questionText = request.attrs.get(QuestionTextValidator.QUESTION_TEXT_KEY)
        questionService.createQuestion(request.body, user, questionText) match
          case Left(error)     => toResult(error)
          case Right(question) => Ok(question.asJson)
      }

  def updateQuestion(id: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(questionTextSanitizer)(parse.json) { request =>
        val user         = request.attrs(Auth.ATTR_USER)
        val questionText = request.attrs.get(QuestionTextValidator.QUESTION_TEXT_KEY)
        questionService.updateQuestion(id, request.body, user, questionText) match
          case Left(error)     => toResult(error)
          case Right(question) => Ok(question.asJson)
      }

  def deleteQuestion(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        questionService.deleteQuestion(id, user) match
          case Left(error) => toResult(error)
          case Right(_)    => Ok
    }

  def addOwner(uid: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))(
        parse.json
      ) { request =>
        val modifier = request.attrs(Auth.ATTR_USER)
        questionService.addOwner(uid, request.body, modifier) match
          case Left(error)     => toResult(error)
          case Right(newOwner) => Ok(newOwner.asJson)
      }

  def exportQuestions(): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))(
        parse.json
      ) { request =>
        val document = questionService.exportQuestions(request.body)
        Ok(document)
          .withHeaders("Content-Disposition" -> "attachment; filename=\"moodle-quiz.xml\"")
          .as("application/xml")
      }

  def importQuestions(): Action[MultipartFormData[TemporaryFile]] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))(
        parse.multipartFormData
      ) {
        request =>
          request.body.file("file") match
            case None => BadRequest(QuestionError.FileNotFound.message)
            case Some(filePart) =>
              val content = Using(scala.io.Source.fromFile(filePart.ref.path.toFile))(_.mkString)
                .getOrElse(throw new RuntimeException("Failed to read file"))
              val user                = request.attrs(Auth.ATTR_USER)
              val (successes, errors) = questionService.importQuestions(content, user)
              Ok(play.api.libs.json.Json.obj(
                "errorCount"   -> errors.length,
                "successCount" -> successes.length
              ))
      }

  def getQuestionPreview(qid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        questionService.getQuestionPreview(qid, user) match
          case Left(error) => toResult(error)
          case Right(data) => Ok(data)
    }

  def getExamSectionQuestionPreview(esqId: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        questionService.getExamSectionQuestionPreview(esqId, user) match
          case Left(error) => toResult(error)
          case Right(data) => Ok(data)
    }
