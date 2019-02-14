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

package backend.controllers

import javax.inject.Inject
import backend.impl.ExternalCourseHandler
import backend.models.{Course, Role, Session, User}
import backend.system.Authenticator
import backend.util.scala.JsonResponder
import io.ebean.Ebean
import play.api.cache.SyncCacheApi
import play.api.mvc.{Action, AnyContent, InjectedController, Result}
import play.libs.Json

import scala.collection.JavaConverters._
import scala.compat.java8.FutureConverters
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future


class CourseController @Inject()(externalApi: ExternalCourseHandler, cache: SyncCacheApi)
  extends InjectedController with Authenticator with JsonResponder {

  override def sessionCache: SyncCacheApi = cache

  def criteriaLengthLimiter = 2

  def listCourses(filterType: Option[String], criteria: Option[String], user: User): Future[Result] = {
    (filterType, criteria) match {
      case (Some("code"), Some(x)) =>
        FutureConverters.toScala(externalApi.getCoursesByCode(user, x)).map(i => java2Response(i))
      case (Some("name"), Some(x)) if x.length >= criteriaLengthLimiter =>
        Future {
          Ebean.find(classOf[Course]).where
            .ilike("name", s"%$x%")
            .orderBy("code")
            .findList
        }.map(c => java2Response(c))
      case (Some("name"), Some(_)) =>
        throw new IllegalArgumentException("Too short criteria")
      case _ =>
        Future {
          Ebean.find(classOf[Course]).where.isNotNull("name").orderBy("code").findList
        }.map(c => java2Response(c))
    }
  }

  def getUserCourses(session: Session, user: User, examIds: Option[List[Long]], sectionIds: Option[List[Long]],
                     tagIds: Option[List[Long]]): Result = {
    var query = Ebean.find(classOf[Course]).where.isNotNull("name")
    if (!user.hasRole(Role.Name.ADMIN)) {
      query = query
        .eq("exams.examOwners", user)
    }
    if (examIds.getOrElse(Nil).nonEmpty) {
      query = query.in("exams.id", examIds.get.asJava)
    }
    if (sectionIds.getOrElse(Nil).nonEmpty) {
      query = query.in("exams.examSections.id", sectionIds.get.asJava)
    }
    if (tagIds.getOrElse(Nil).nonEmpty) {
      query = query.in("exams.examSections.sectionQuestions.question.parent.tags.id", tagIds.get.asJava)
    }
    Ok(Json.toJson(query.orderBy("name desc").findList).toString)
  }

  // Actions ->

  def getCourses(filterType: Option[String], criteria: Option[String]): Action[AnyContent] = Action.async { request =>
    getAuthorizedUser(request, Seq("ADMIN", "TEACHER")) match {
      case Some((_, user)) =>
        listCourses(filterType, criteria, user)
      case _ =>
        Future.successful(forbid())
    }
  }


  def getCourse(id: Long) = Action { request =>
    getAuthorizedUser(request, Seq("ADMIN", "TEACHER")) match {
      case Some(_) =>
        val results = Ebean.find(classOf[Course], id)
        Ok(Json.toJson(results).toString)
      case _ =>
        forbid()
    }
  }

  def listUsersCourses(examIds: Option[List[Long]], sectionIds: Option[List[Long]],
                       tagIds: Option[List[Long]]): Action[AnyContent] = Action { request =>
    getAuthorizedUser(request, Seq("ADMIN", "TEACHER")) match {
      case Some((session, user)) =>
        getUserCourses(session, user, examIds, sectionIds, tagIds)
      case _ =>
        forbid()
    }
  }

}
