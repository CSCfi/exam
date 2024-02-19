/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package controllers

import impl.ExternalCourseHandler
import io.ebean.DB
import models.{Course, Role, User}
import org.joda.time.DateTime
import play.api.mvc.{Action, AnyContent, InjectedController, Result}
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}
import util.config.ConfigReader
import util.scala.JavaJsonResultProducer

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters._
import scala.jdk.FutureConverters._

class CourseController @Inject() (
    externalApi: ExternalCourseHandler,
    configReader: ConfigReader,
    authenticated: AuthenticatedAction,
    implicit val ec: AuthExecutionContext
) extends InjectedController
    with JavaJsonResultProducer:

  def listCourses(
      filterType: Option[String],
      criteria: Option[String],
      user: User
  ): Future[Result] =
    (filterType, criteria) match
      case (Some("code"), Some(c)) =>
        externalApi.getCoursesByCode(user, c).asScala.map(_.asScala.toResult(OK))
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
            .findList
            .asScala
            .filter(c =>
              c.getStartDate == null || configReader
                .getCourseValidityDate(new DateTime(c.getStartDate))
                .isBeforeNow
            )
        }.map(_.toResult(OK))
      case (Some("name"), Some(_)) =>
        throw new IllegalArgumentException("Too short criteria")
      case _ =>
        Future {
          DB.find(classOf[Course]).where.isNotNull("name").orderBy("code").findList
        }.map(_.asScala.toResult(OK))

  private def getUserCourses(user: User,
                             examIds: Option[List[Long]],
                             sectionIds: Option[List[Long]],
                             tagIds: Option[List[Long]],
                             ownerIds: Option[List[Long]]): Result =
    var query = DB.find(classOf[Course]).where.isNotNull("name")
    if !user.hasRole(Role.Name.ADMIN) then
      query = query
        .eq("exams.examOwners", user)
    if examIds.getOrElse(Nil).nonEmpty then query = query.in("exams.id", examIds.get.asJava)
    if sectionIds.getOrElse(Nil).nonEmpty then
      query = query.in("exams.examSections.id", sectionIds.get.asJava)
    if tagIds.getOrElse(Nil).nonEmpty then
      query =
        query.in("exams.examSections.sectionQuestions.question.parent.tags.id", tagIds.get.asJava)

    if (ownerIds.getOrElse(Nil).nonEmpty)
      query =
        query.in("exams.examOwners.id", ownerIds.get.asJava)
    query.orderBy("name desc").findList.asScala.toResult(OK)

  // Actions ->
  def getCourses(filterType: Option[String], criteria: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      listCourses(filterType, criteria, user)
    }

  def getCourse(id: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { _ =>
      DB.find(classOf[Course], id).toResult(OK)
    }

  def listUsersCourses(examIds: Option[List[Long]],
                       sectionIds: Option[List[Long]],
                       tagIds: Option[List[Long]],
                       ownerIds: Option[List[Long]]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      getUserCourses(user, examIds, sectionIds, tagIds, ownerIds)
    }
