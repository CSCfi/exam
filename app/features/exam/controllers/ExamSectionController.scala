// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.controllers

import database.EbeanJsonExtensions
import features.exam.services.ExamSectionError.*
import features.exam.services.{ExamSectionError, ExamSectionService}
import io.ebean.text.PathProperties
import models.user.Role
import play.api.libs.json.{JsValue, Json}
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import system.AuditedAction
import validation.core.PlayJsonHelper

import javax.inject.Inject
import scala.concurrent.Future

class ExamSectionController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    private val examSectionService: ExamSectionService,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  private def toResult(error: ExamSectionError): Result =
    error match
      case ExamNotFound                  => NotFound("i18n_error_not_found")
      case SectionNotFound               => NotFound("i18n_error_not_found")
      case QuestionNotFound              => NotFound("i18n_error_not_found")
      case SectionQuestionNotFound       => NotFound("i18n_error_not_found")
      case AccessForbidden               => Forbidden("i18n_error_access_forbidden")
      case FutureReservationsExist       => Forbidden("i18n_error_future_reservations_exist")
      case AutoEvaluationEssayQuestion   => Forbidden("i18n_error_autoevaluation_essay_question")
      case QuestionAlreadyInSection      => BadRequest("i18n_question_already_in_section")
      case MissingSequenceNumber         => BadRequest("Missing sequenceNumber")
      case MissingQuestions              => BadRequest("Missing sequenceNumber or questions")
      case MissingFromOrTo               => BadRequest("Missing 'from' or 'to' parameter")
      case MissingOptionsArray           => BadRequest("Missing options array")
      case CorrectOptionRequired         => BadRequest("i18n_correct_option_required")
      case IncorrectClaimQuestionOptions => BadRequest("i18n_incorrect_claim_question_options")
      case ValidationError(message)      => BadRequest(message)

  def insertSection(eid: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(
      Role.Name.TEACHER,
      Role.Name.ADMIN,
      Role.Name.SUPPORT
    ))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        examSectionService.insertSection(eid, user) match
          case Left(error) => toResult(error)
          case Right(section) =>
            Ok(section.asJson(PathProperties.parse("(*, examMaterials(*), sectionQuestions(*))")))
    }

  def removeSection(eid: Long, sid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        examSectionService.removeSection(eid, sid, user) match
          case Left(error) => toResult(error)
          case Right(_)    => Ok
    }

  def updateSection(eid: Long, sid: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .async(parse.json) { request =>
        val user             = request.attrs(Auth.ATTR_USER)
        val body             = request.body
        val name             = PlayJsonHelper.parse[String]("name", body)
        val expanded         = PlayJsonHelper.parseOrElse("expanded", body, false)
        val lotteryOn        = PlayJsonHelper.parseOrElse("lotteryOn", body, false)
        val lotteryItemCount = PlayJsonHelper.parseOrElse("lotteryItemCount", body, 1)
        val description      = PlayJsonHelper.parse[String]("description", body)
        val optional         = PlayJsonHelper.parseOrElse("optional", body, false)

        examSectionService.updateSection(
          eid,
          sid,
          user,
          name,
          expanded,
          lotteryOn,
          lotteryItemCount,
          description,
          optional
        ) match
          case Left(error)    => Future.successful(toResult(error))
          case Right(section) => Future.successful(Ok(section.asJson))
      }

  def reorderSections(eid: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .async(parse.json) { request =>
        val body    = request.body
        val fromOpt = PlayJsonHelper.parse[Int]("from", body)
        val toOpt   = PlayJsonHelper.parse[Int]("to", body)

        (fromOpt, toOpt) match
          case (Some(from), Some(to)) =>
            examSectionService.reorderSections(eid, from, to, request.attrs(Auth.ATTR_USER)) match
              case Left(error) => Future.successful(toResult(error))
              case Right(_)    => Future.successful(Ok)
          case _ => Future.successful(toResult(MissingFromOrTo))
      }

  def reorderSectionQuestions(eid: Long, sid: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .async(parse.json) { request =>
        val body    = request.body
        val fromOpt = PlayJsonHelper.parse[Int]("from", body)
        val toOpt   = PlayJsonHelper.parse[Int]("to", body)

        (fromOpt, toOpt) match
          case (Some(from), Some(to)) =>
            examSectionService.reorderSectionQuestions(
              eid,
              sid,
              from,
              to,
              request.attrs(Auth.ATTR_USER)
            ) match
              case Left(error) => Future.successful(toResult(error))
              case Right(_)    => Future.successful(Ok)
          case _ => Future.successful(toResult(MissingFromOrTo))
      }

  def insertQuestion(eid: Long, sid: Long, qid: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .async(parse.json) { request =>
        val user   = request.attrs(Auth.ATTR_USER)
        val body   = request.body
        val seqOpt = PlayJsonHelper.parse[Int]("sequenceNumber", body)

        seqOpt match
          case None => Future.successful(toResult(MissingSequenceNumber))
          case Some(seq) =>
            examSectionService.insertQuestion(eid, sid, qid, seq, user) match
              case Left(error)    => Future.successful(toResult(error))
              case Right(section) => Future.successful(Ok(section.asJson))
      }

  def insertMultipleQuestions(eid: Long, sid: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .async(parse.json) { request =>
        val user         = request.attrs(Auth.ATTR_USER)
        val body         = request.body
        val sequenceOpt  = PlayJsonHelper.parse[Int]("sequenceNumber", body)
        val questionsOpt = PlayJsonHelper.parseCommaSeparatedLongs("questions", body)

        (sequenceOpt, questionsOpt) match
          case (Some(sequence), Some(questions)) =>
            examSectionService.insertMultipleQuestions(eid, sid, sequence, questions, user) match
              case Left(error)    => Future.successful(toResult(error))
              case Right(section) => Future.successful(Ok(section.asJson))
          case _ => Future.successful(toResult(MissingQuestions))
      }

  def removeQuestion(eid: Long, sid: Long, qid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        examSectionService.removeQuestion(eid, sid, qid, user) match
          case Left(error)    => toResult(error)
          case Right(section) => Ok(section.asJson)
    }

  def clearQuestions(eid: Long, sid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        examSectionService.clearQuestions(eid, sid, user) match
          case Left(error)    => toResult(error)
          case Right(section) => Ok(section.asJson)
    }

  def updateDistributedExamQuestion(eid: Long, sid: Long, qid: Long): Action[JsValue] =
    audited
      .andThen(authenticated)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .async(parse.json) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        val body = request.body

        examSectionService.updateDistributedExamQuestion(eid, sid, qid, user, body) match
          case Left(error) => Future.successful(toResult(error))
          case Right(examSectionQuestion) =>
            val pp = PathProperties.parse("(*, question(*, options(*)), options(*, option(*)))")
            Future.successful(Ok(examSectionQuestion.asJson(pp)))
      }

  def updateUndistributedExamQuestion(eid: Long, sid: Long, qid: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(
      Role.Name.TEACHER,
      Role.Name.ADMIN,
      Role.Name.SUPPORT
    ))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        examSectionService.updateUndistributedExamQuestion(eid, sid, qid, user) match
          case Left(error) => toResult(error)
          case Right(examSectionQuestion) =>
            val pp = PathProperties.parse(
              "(*, question(*, attachment(*), options(*)), options(*, option(*)))"
            )
            Ok(examSectionQuestion.asJson(pp))
    }

  def getQuestionDistribution(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      _ =>
        examSectionService.getQuestionDistribution(id) match
          case Left(error)          => toResult(error)
          case Right(isDistributed) => Ok(Json.obj("distributed" -> isDistributed))
    }

  def listSections(
      filter: Option[String],
      courseIds: Option[List[Long]],
      examIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      request =>
        val user = request.attrs(Auth.ATTR_USER)
        val sections =
          examSectionService.listSections(user, filter, courseIds, examIds, tagIds, ownerIds)
        Ok(sections.asJson(PathProperties.parse("(*, creator(id))")))
    }
