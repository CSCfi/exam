// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.exam

import impl.ExternalCourseHandler
import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.exam.Course
import models.user.{Role, User}
import org.joda.time.DateTime
import play.api.mvc._
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters._

class CourseController @Inject() (
    externalApi: ExternalCourseHandler,
    configReader: ConfigReader,
    authenticated: AuthenticatedAction,
    implicit val ec: AuthExecutionContext
) extends InjectedController
    with JavaApiHelper
    with DbApiHelper:

  private def listCourses(
      filterType: Option[String],
      criteria: Option[String],
      user: User
  ): Future[Result] =
    (filterType, criteria) match
      case (Some("code"), Some(c)) =>
        externalApi.getCoursesByCode(user, c.trim).map(cs => Ok(cs.asJson))
      case (Some("name"), Some(x)) if x.length >= 2 =>
        Future {
          DB.find(classOf[Course])
            .where
            .disjunction()
            .isNull("endDate")
            .gt("endDate", DateTime.now())
            .endJunction()
            .ilike("name", s"%$x%")
            .orderBy("code")
            .list
            .filter(c =>
              Option(c.getStartDate).isEmpty || configReader
                .getCourseValidityDate(new DateTime(c.getStartDate))
                .isBeforeNow
            )
        }.map(data => Ok(data.asJson))
      case (Some("name"), Some(_)) =>
        throw new IllegalArgumentException("Too short criteria")
      case _ =>
        Future {
          DB.find(classOf[Course]).where.isNotNull("name").orderBy("code").list
        }.map(data => Ok(data.asJson))

  private def getUserCourses(
      user: User,
      examIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): Result =
    val baseQuery = DB.find(classOf[Course]).where.isNotNull("name")
    val withOwnerFilter = if !user.hasRole(Role.Name.ADMIN) then
      baseQuery.eq("exams.examOwners", user)
    else baseQuery
    val withExamFilter = examIds.filter(_.nonEmpty).fold(withOwnerFilter) { ids =>
      withOwnerFilter.in("exams.id", ids.asJava)
    }
    val withSectionFilter = sectionIds.filter(_.nonEmpty).fold(withExamFilter) { ids =>
      withExamFilter.in("exams.examSections.id", ids.asJava)
    }
    val withTagFilter = tagIds.filter(_.nonEmpty).fold(withSectionFilter) { ids =>
      withSectionFilter.in("exams.examSections.sectionQuestions.question.parent.tags.id", ids.asJava)
    }
    val query = ownerIds.filter(_.nonEmpty).fold(withTagFilter) { ids =>
      withTagFilter.in("exams.examOwners.id", ids.asJava)
    }
    Ok(query.orderBy("name desc").list.asJson)

  // Actions ->
  def getCourses(filterType: Option[String], criteria: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      listCourses(filterType, criteria, user)
    }

  def getCourse(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Ok(DB.find(classOf[Course], id).asJson)
    }

  def listUsersCourses(
      examIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      getUserCourses(user, examIds, sectionIds, tagIds, ownerIds)
    }
