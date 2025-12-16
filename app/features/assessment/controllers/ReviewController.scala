// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.controllers

import features.assessment.services.{ReviewError, ReviewService}
import system.interceptors.AnonymousHandler
import io.ebean.text.PathProperties
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json._
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import system.interceptors.AnonymousJsonFilter
import validation.CommaJoinedListValidator
import validation.assessment.CommentValidator
import validation.core.{ScalaAttrs, Validators}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ReviewController @Inject() (
    val controllerComponents: ControllerComponents,
    val validators: Validators,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val anonymous: AnonymousJsonFilter,
    private val reviewService: ReviewService,
    implicit val ec: ExecutionContext
) extends BaseController
    with AnonymousHandler
    with EbeanJsonExtensions:

  def listParticipationsForExamAndUser(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user", "preEnrolledUserEmail", "grade"))) { request =>
        reviewService.findExam(eid) match
          case Some(exam) =>
            val participations = reviewService.listParticipationsForExamAndUser(exam)
            writeAnonymousResult(request, Ok(participations.asJson), exam.isAnonymous)
          case None => NotFound("No exam with id " + eid + " found")
      }

  def listNoShowsForExamAndUser(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user", "preEnrolledUserEmail"))) { request =>
        reviewService.findExam(eid) match
          case Some(exam) =>
            val enrolments = reviewService.listNoShowsForExamAndUser(exam)
            writeAnonymousResult(request, Ok(enrolments.asJson), exam.isAnonymous)
          case None => NotFound
      }

  def getReview(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user", "preEnrolledUserEmail", "creator", "modifier", "reservation"))) { request =>
        val user            = request.attrs(Auth.ATTR_USER)
        val blankAnswerText = reviewService.getBlankAnswerText(user)
        reviewService.getReview(eid, user, blankAnswerText) match
          case Right(participation) =>
            val exam = participation.getExam
            writeAnonymousResult(request, Ok(participation.asJson), exam.isAnonymous)
          case Left(ReviewError.AccessForbidden) =>
            Forbidden(ReviewError.AccessForbidden.message)
          case Left(ReviewError.ParticipationNotFound) =>
            NotFound("No exam with id " + eid + " found")
          case Left(_) => BadRequest
      }

  def listReviews(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user", "creator", "modifier"))) { request =>
        val user             = request.attrs(Auth.ATTR_USER)
        val (exams, anonIds) = reviewService.listReviews(eid, user)
        val participations   = reviewService.buildParticipationsJson(exams)
        withAnonymousResult(request, Ok(Json.toJson(participations)), anonIds.toSet)
      }

  def scoreExamQuestion(id: Long): Action[JsValue] =
    Action
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(audited)(parse.json) { request =>
        val score = (request.body \ "evaluatedScore").asOpt[Double]
        reviewService.scoreExamQuestion(id, score) match
          case Right(_)                           => Ok
          case Left(ReviewError.QuestionNotFound) => NotFound(ReviewError.QuestionNotFound.message)
          case Left(_)                            => BadRequest
      }

  def forceScoreExamQuestion(id: Long): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(audited)(parse.json) { request =>
        val user  = request.attrs(Auth.ATTR_USER)
        val score = (request.body \ "forcedScore").asOpt[Double]
        reviewService.forceScoreExamQuestion(id, score, user) match
          case Right(_) => Ok
          case Left(ReviewError.NoPermissionToScore) =>
            Forbidden(ReviewError.NoPermissionToScore.message)
          case Left(ReviewError.NotAllowedToUpdateScoring) =>
            Forbidden(ReviewError.NotAllowedToUpdateScoring.message)
          case Left(ReviewError.InvalidScoreRange) =>
            Forbidden(ReviewError.InvalidScoreRange.message)
          case Left(ReviewError.QuestionNotFound) => NotFound(ReviewError.QuestionNotFound.message)
          case Left(_)                            => NotFound
      }

  def updateAssessmentInfo(id: Long): Action[JsValue] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER)))(parse.json).andThen(audited) { request =>
      val info = (request.body \ "assessmentInfo").asOpt[String]
      val user = request.attrs(Auth.ATTR_USER)
      reviewService.updateAssessmentInfo(id, info, user) match
        case Right(_) => Ok
        case Left(ReviewError.ModificationForbidden) =>
          Forbidden(ReviewError.ModificationForbidden.message)
        case Left(ReviewError.ExamNotFound) => NotFound(ReviewError.ExamNotFound.message)
        case Left(_)                        => NotFound
    }

  def reviewExam(id: Long): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(audited)(parse.json) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        reviewService.reviewExam(id, request.body, user) match
          case Right(_) => Ok
          case Left(ReviewError.ModificationForbidden) =>
            Forbidden(ReviewError.ModificationForbidden.message)
          case Left(ReviewError.NotAllowedToUpdateGrading) =>
            Forbidden(ReviewError.NotAllowedToUpdateGrading.message)
          case Left(ReviewError.InvalidGradeForScale) =>
            BadRequest(ReviewError.InvalidGradeForScale.message)
          case Left(ReviewError.ExamNotFound) => NotFound(ReviewError.ExamNotFound.message)
          case Left(_)                        => NotFound(ReviewError.ExamNotFound.message)
      }

  def sendInspectionMessage(eid: Long): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(audited)(parse.json) { request =>
        val loggedInUser = request.attrs(Auth.ATTR_USER)
        val message      = (request.body \ "msg").asOpt[String].orNull
        reviewService.sendInspectionMessage(eid, message, loggedInUser) match
          case Right(_)                       => Ok
          case Left(ReviewError.ExamNotFound) => NotFound(ReviewError.ExamNotFound.message)
          case Left(_)                        => NotFound(ReviewError.ExamNotFound.message)
      }

  def listNoShows(eid: Long, collaborative: Option[Boolean]): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user"))) { request =>
        val (enrolments, anonIds) = reviewService.listNoShows(eid, collaborative)
        val result                = Ok(enrolments.asJson)
        withAnonymousResult(request, result, anonIds)
      }

  def updateComment(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(validators.validated(CommentValidator)) { request =>
        val commentText = request.attrs.get(ScalaAttrs.COMMENT)
        val commentId   = request.attrs.get(ScalaAttrs.COMMENT_ID)
        val user        = request.attrs(Auth.ATTR_USER)
        reviewService.updateComment(eid, commentText, commentId, user) match
          case Right(comment)              => Ok(comment.asJson)
          case Left(ReviewError.Forbidden) => Forbidden(ReviewError.Forbidden.message)
          case Left(ReviewError.ExamNotFound) | Left(ReviewError.CommentNotFound) =>
            NotFound(ReviewError.ExamNotFound.message)
          case Left(_) => NotFound(ReviewError.ExamNotFound.message)
      }

  def addComment(id: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(validators.validated(CommentValidator)) { request =>
        val commentText = request.attrs.get(ScalaAttrs.COMMENT).orNull
        val user        = request.attrs(Auth.ATTR_USER)
        reviewService.addComment(id, commentText, user) match
          case Right(comment) =>
            Ok(comment.asJson(PathProperties.parse("(creator(firstName, lastName, email), created, comment)")))
          case Left(ReviewError.ExamNotFound) => NotFound(ReviewError.ExamNotFound.message)
          case Left(_)                        => NotFound(ReviewError.ExamNotFound.message)
      }

  def archiveExams: Action[AnyContent] = Action
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .andThen(validators.validated(CommaJoinedListValidator)) { request =>
      val ids = request.attrs(ScalaAttrs.ID_LIST)
      reviewService.archiveExams(ids)
      Ok
    }

  def hasLockedAssessments(eid: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val status = reviewService.hasLockedAssessments(eid)
      Ok(Json.obj("status" -> status))
    }

  def markCommentAsRead(eid: Long, cid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(validators.validated(CommentValidator)) { request =>
        request.attrs.get(ScalaAttrs.FEEDBACK_STATUS) match
          case Some(status) =>
            val user = request.attrs(Auth.ATTR_USER)
            reviewService.markCommentAsRead(eid, cid, status, user) match
              case Right(_)                       => Ok
              case Left(ReviewError.Forbidden)    => Forbidden(ReviewError.Forbidden.message)
              case Left(ReviewError.BadRequest)   => BadRequest(ReviewError.BadRequest.message)
              case Left(ReviewError.ExamNotFound) => NotFound(ReviewError.ExamNotFound.message)
              case Left(_)                        => NotFound(ReviewError.ExamNotFound.message)
          case None => BadRequest
      }
