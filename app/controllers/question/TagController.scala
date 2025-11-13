// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.question

import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.questions.{Question, Tag}
import models.user.Role
import play.api.libs.json.*
import play.api.mvc.*
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

class TagController @Inject() (
    val controllerComponents: ControllerComponents,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    implicit val ec: ExecutionContext
) extends BaseController
    with JavaApiHelper
    with DbApiHelper:

  def listTags(
      filter: Option[String],
      courseIds: Option[List[Long]],
      examIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)

      val baseQuery = DB.find(classOf[Tag]).where()
      val queryWithUser =
        if user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then baseQuery
        else baseQuery.eq("creator.id", user.getId)

      val queryWithFilter = filter.fold(queryWithUser) { f =>
        queryWithUser.ilike("name", s"%$f%")
      }

      val queryWithExams = examIds.fold(queryWithFilter) { ids =>
        if ids.nonEmpty then queryWithFilter.in("questions.examSectionQuestions.examSection.exam.id", ids.asJava)
        else queryWithFilter
      }

      val queryWithCourses = courseIds.fold(queryWithExams) { ids =>
        if ids.nonEmpty then queryWithExams.in("questions.examSectionQuestions.examSection.exam.course.id", ids.asJava)
        else queryWithExams
      }

      val queryWithSections = sectionIds.fold(queryWithCourses) { ids =>
        if ids.nonEmpty then queryWithCourses.in("questions.examSectionQuestions.examSection.id", ids.asJava)
        else queryWithCourses
      }

      val finalQuery = ownerIds.fold(queryWithSections) { ids =>
        if ids.nonEmpty then queryWithSections.in("questions.questionOwners.id", ids.asJava)
        else queryWithSections
      }

      val tags = finalQuery.distinct
      val pp   = PathProperties.parse("(*, creator(id), questions(id))")

      Ok(tags.asJson(pp))
    }

  def addTagToQuestions(): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.SUPPORT)))(parse.json) { request =>
      val questionIds = (request.body \ "questionIds").as[List[Long]]
      val tagId       = (request.body \ "tagId").as[Long]

      val questions = DB.find(classOf[Question]).where().idIn(questionIds.asJava).list
      Option(DB.find(classOf[Tag], tagId)) match
        case Some(tag) =>
          questions.foreach { question =>
            if !question.getTags.contains(tag) then
              question.getTags.add(tag)
              question.update()
          }
          Ok
        case None => NotFound("Tag not found")
    }
