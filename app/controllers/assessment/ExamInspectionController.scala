// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assessment

import controllers.base.scala.ExamBaseController
import impl.mail.EmailComposer
import io.ebean.DB
import miscellaneous.scala.DbApiHelper
import models.assessment.{Comment, ExamInspection}
import models.exam.Exam
import models.user.{Role, User}
import org.apache.pekko.actor.ActorSystem
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}
import validation.scala.CommentValidator
import validation.scala.core.{ScalaAttrs, Validators}

import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

class ExamInspectionController @Inject() (
    val controllerComponents: ControllerComponents,
    val validators: Validators,
    val authenticated: AuthenticatedAction,
    val actorSystem: ActorSystem,
    val emailComposer: EmailComposer,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with ExamBaseController
    with DbApiHelper:

  def addInspection(eid: Long, uid: Long): Action[AnyContent] = authenticated
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
    .andThen(validators.validated(CommentValidator)) { request =>
      val recipient = Option(DB.find(classOf[User], uid))
      val exam      = Option(DB.find(classOf[Exam], eid))
      (exam, recipient) match
        case (Some(exam), Some(recipient)) =>
          val user = request.attrs(Auth.ATTR_USER)
          if !user.isAdminOrSupport && !exam.isOwnedOrCreatedBy(user) then Forbidden("i18n_error_access_forbidden")
          if isInspectorOf(recipient, exam) then Forbidden("already an inspector")
          val commentText = request.attrs.get(ScalaAttrs.COMMENT)
          if Option(exam.getName).map(_.isEmpty).isEmpty && commentText.isDefined then
            BadRequest("i18n_exam_name_missing_or_too_short")
          val inspection = new ExamInspection
          inspection.setExam(exam)
          inspection.setUser(recipient)
          inspection.setAssignedBy(user)
          commentText match
            case Some(text) =>
              val c = new Comment
              c.setCreatorWithDate(user)
              c.setComment(text)
              inspection.setComment(c)
              c.save()
              actorSystem.scheduler.scheduleOnce(
                1.seconds
              )(emailComposer.composeExamReviewRequest(recipient, user, exam, text))
            case None => ()
          inspection.save()
          // Add also as inspector to ongoing child exams if not already there.
          exam.getChildren.asScala
            .filter(e =>
              e.hasState(Exam.State.REVIEW, Exam.State.STUDENT_STARTED, Exam.State.REVIEW_STARTED)
                && !isInspectorOf(recipient, e)
            )
            .foreach(e => {
              val i = new ExamInspection
              i.setExam(e)
              i.setUser(recipient)
              i.setAssignedBy(user)
              i.save()
            })
          Ok(inspection.asJson)
        case _ => NotFound
    }

  def setOutcome(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      request.body.asJson match
        case Some(json) =>
          Option(DB.find(classOf[ExamInspection], id)) match
            case Some(inspection) =>
              val ready = (json \ "ready").asOpt[Boolean].getOrElse(false)
              inspection.setReady(ready)
              inspection.update()
              Ok
            case None => NotFound
        case None => BadRequest
    }

  def listInspections(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val inspections = DB
        .find(classOf[ExamInspection])
        .fetch("user", "id, email, firstName, lastName")
        .where()
        .eq("exam.id", id)
        .distinct
      Ok(inspections.asJson)
    }

  def deleteInspection(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      Option(DB.find(classOf[ExamInspection], id)) match
        case Some(inspection) =>
          inspection.getExam.getChildren.asScala
            .filter(c => c.hasState(Exam.State.REVIEW, Exam.State.STUDENT_STARTED, Exam.State.REVIEW_STARTED))
            .foreach(c =>
              c.getExamInspections.asScala
                .filter(ei => ei.getUser.equals(inspection.getUser))
                .foreach(_.delete)
            )
          inspection.delete()
          Ok
        case None => NotFound
    }

  private def isInspectorOf(user: User, exam: Exam) = exam.getExamInspections.asScala.exists(_.getUser == user)
