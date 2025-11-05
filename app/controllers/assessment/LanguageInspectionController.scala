// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assessment

import controllers.base.scala.ExamBaseController
import impl.mail.EmailComposer
import io.ebean.{DB, ExpressionList, FetchConfig}
import miscellaneous.scala.DbApiHelper
import models.assessment.{Comment, LanguageInspection}
import models.exam.Exam
import models.user.Permission.Type
import models.user.Role
import org.apache.pekko.actor.ActorSystem
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext, CombinedRoleAndPermissionFilter, PermissionFilter}
import system.AuditedAction
import validation.scala.CommentValidator
import validation.scala.core.{ScalaAttrs, Validators}

import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.Date
import javax.inject.Inject
import scala.concurrent.duration.DurationInt
import scala.jdk.CollectionConverters.CollectionHasAsScala

class LanguageInspectionController @Inject() (
    val controllerComponents: ControllerComponents,
    val validators: Validators,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val actorSystem: ActorSystem,
    val emailComposer: EmailComposer,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with ExamBaseController
    with DbApiHelper
    with Logging:

  def listInspections(month: Option[String], start: Option[Long], end: Option[Long]): Action[AnyContent] =
    authenticated.andThen(CombinedRoleAndPermissionFilter.anyMatch(Type.CAN_INSPECT_LANGUAGE, Role.Name.ADMIN)) {
      request =>
        val query = DB
          .find(classOf[LanguageInspection])
          .fetch("exam")
          .fetch("exam.course")
          .fetch("exam.creator", "firstName, lastName, email, userIdentifier")
          .fetch("exam.parent.examOwners", "firstName, lastName, email, userIdentifier")
          .fetch("exam.examLanguages", FetchConfig.ofQuery)
          .fetch("statement")
          .fetch("creator", "firstName, lastName, email, userIdentifier")
          .fetch("assignee", "firstName, lastName, email, userIdentifier")
          .where
          .ne("exam.state", Exam.State.DELETED)
        val filteredQuery = applyDateFilters(query, month, start, end)
        Ok(filteredQuery.distinct.asJson)
    }

  def createInspection(): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)).andThen(audited))(parse.json) {
        request =>
          val examId = (request.body \ "examId").as[Long]
          Option(DB.find(classOf[Exam], examId)) match
            case Some(exam) =>
              if Option(exam.getLanguageInspection).isDefined then Forbidden("already sent for inspection")
              else if !exam.getSubjectToLanguageInspection then Forbidden("not allowed for language inspection")
              else
                val inspection = new LanguageInspection
                inspection.setExam(exam)
                inspection.setCreatorWithDate(request.attrs(Auth.ATTR_USER))
                inspection.save()
                Ok
            case None => BadRequest
      }

  def assignInspection(id: Long): Action[AnyContent] =
    authenticated.andThen(PermissionFilter(Type.CAN_INSPECT_LANGUAGE)) { request =>
      Option(DB.find(classOf[LanguageInspection], id)) match
        case Some(inspection) =>
          if Option(inspection.getAssignee).isDefined then Forbidden("Inspection already assigned")
          val user = request.attrs(Auth.ATTR_USER)
          inspection.setModifierWithDate(user)
          inspection.setAssignee(user)
          inspection.setStartedAt(new Date())
          inspection.update()
          Ok
        case None => NotFound("inspection not found")
    }

  def setApproval(id: Long): Action[JsValue] =
    authenticated.andThen(PermissionFilter(Type.CAN_INSPECT_LANGUAGE))(parse.json).andThen(audited) { request =>
      (request.body \ "approved").asOpt[Boolean] match
        case Some(approval) =>
          Option(DB.find(classOf[LanguageInspection], id)) match
            case Some(inspection) =>
              if Option(inspection.getStartedAt).isEmpty then Forbidden("Inspection not assigned")
              if Option(inspection.getFinishedAt).isEmpty then Forbidden("Inspection already finalized")
              if Option(inspection.getStatement).isEmpty || inspection.getStatement.getComment.isEmpty then
                Forbidden("No statement given")
              inspection.setFinishedAt(new Date)
              inspection.setApproved(approval)
              val user = request.attrs(Auth.ATTR_USER)
              inspection.setModifierWithDate(user)
              inspection.update()

              val recipients = inspection.getExam.getParent.getExamOwners.asScala
              actorSystem.scheduler.scheduleOnce(1.seconds)(recipients.foreach(r =>
                emailComposer.composeLanguageInspectionFinishedMessage(r, user, inspection)
                logger.info(s"Language inspection finalization email sent to ${r.getEmail}")
              ))
              Ok
            case None => NotFound("inspection not found")
        case None => BadRequest
    }

  def setStatement(id: Long): Action[AnyContent] = authenticated
    .andThen(PermissionFilter(Type.CAN_INSPECT_LANGUAGE))
    .andThen(validators.validated(CommentValidator))
    .andThen(audited) { request =>
      request.attrs.get(ScalaAttrs.COMMENT) match
        case Some(comment) =>
          Option(DB.find(classOf[LanguageInspection], id)) match
            case Some(inspection) =>
              if Option(inspection.getStartedAt).isEmpty then Forbidden("Inspection not assigned")
              if Option(inspection.getFinishedAt).isEmpty then Forbidden("Inspection already finalized")
              val user = request.attrs(Auth.ATTR_USER)
              val statement = Option(inspection.getStatement).getOrElse {
                val newComment = new Comment
                newComment.setCreatorWithDate(user)
                newComment.save()
                inspection.setStatement(newComment)
                inspection.update()
                newComment
              }
              statement.setComment(comment)
              statement.setModifierWithDate(user)
              statement.update()
              inspection.setModifierWithDate(user)
              inspection.update()
              Ok(inspection.asJson)
            case None => NotFound("inspection not found")
        case None => BadRequest("No comment given")
    }

  private def applyDateFilters(
      query: ExpressionList[LanguageInspection],
      month: Option[String],
      start: Option[Long],
      end: Option[Long]
  ): ExpressionList[LanguageInspection] =
    (start, end, month) match
      // Case 1: Range filter (start and/or end)
      case (Some(_), _, _) | (_, Some(_), _) =>
        val withStart = start.fold(query) { s =>
          val startDate = new DateTime(s).plusDays(1).withTimeAtStartOfDay()
          query.ge("finishedAt", startDate.toDate)
        }
        end.fold(withStart) { e =>
          val endDate = new DateTime(e).plusDays(1).withTimeAtStartOfDay()
          withStart.lt("finishedAt", endDate.toDate)
        }

      // Case 2: Month filter
      case (None, None, Some(monthStr)) =>
        val decoded      = URLDecoder.decode(monthStr, StandardCharsets.UTF_8)
        val startOfMonth = DateTime.parse(decoded).withMillisOfDay(0)
        val endOfMonth   = startOfMonth.plusMonths(1)
        query.between("finishedAt", startOfMonth.toDate, endOfMonth.toDate)

      // Case 3: No filter
      case _ => query
