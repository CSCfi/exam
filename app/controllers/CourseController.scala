// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers

import impl.ExternalCourseHandler
import io.ebean.DB
import models.{Course, Role, User}
import org.joda.time.DateTime
import play.api.mvc.*
import security.scala.Auth.{authorized, AuthenticatedAction}
import security.scala.{Auth, AuthExecutionContext}
import system.AuditedAction
import util.config.ConfigReader
import util.scala.{DbApiHelper, JavaApiHelper}

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.jdk.FutureConverters.*

class CourseController @Inject() (
    externalApi: ExternalCourseHandler,
    configReader: ConfigReader,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
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
        externalApi.getCoursesByCode(user, c).asScala.map(_.asScala.toResult(Results.Ok))
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
              c.getStartDate == null || configReader
                .getCourseValidityDate(new DateTime(c.getStartDate))
                .isBeforeNow
            )
        }.map(_.toResult(Results.Ok))
      case (Some("name"), Some(_)) =>
        throw new IllegalArgumentException("Too short criteria")
      case _ =>
        Future {
          DB.find(classOf[Course]).where.isNotNull("name").orderBy("code").list
        }.map(_.toResult(Results.Ok))

  private def getUserCourses(
      user: User,
      examIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): Result =
    var query = DB.find(classOf[Course]).where.isNotNull("name")
    if !user.hasRole(Role.Name.ADMIN) then
      query = query
        .eq("exams.examOwners", user)
    if examIds.getOrElse(Nil).nonEmpty then query = query.in("exams.id", examIds.get.asJava)
    if sectionIds.getOrElse(Nil).nonEmpty then query = query.in("exams.examSections.id", sectionIds.get.asJava)
    if tagIds.getOrElse(Nil).nonEmpty then
      query = query.in("exams.examSections.sectionQuestions.question.parent.tags.id", tagIds.get.asJava)

    if ownerIds.getOrElse(Nil).nonEmpty then query = query.in("exams.examOwners.id", ownerIds.get.asJava)
    query.orderBy("name desc").findList.asScala.toResult(Results.Ok)

  // Actions ->
  def getCourses(filterType: Option[String], criteria: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER))).andThen(audited).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      listCourses(filterType, criteria, user)
    }

  def getCourse(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))).andThen(audited) { _ =>
      DB.find(classOf[Course], id).toResult(Results.Ok)
    }

  def listUsersCourses(
      examIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))).andThen(audited) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      getUserCourses(user, examIds, sectionIds, tagIds, ownerIds)
    }
