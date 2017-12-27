/*
 * Copyright (c) 2017 Exam Consortium
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

import javax.inject.Inject

import impl.ExternalCourseHandler
import io.ebean.Ebean
import models.{Course, User}
import play.api.cache.SyncCacheApi
import play.api.mvc.{Action, AnyContent, InjectedController, Result}
import play.libs.Json
import system.Authenticator
import util.scala.JsonResponder

import scala.collection.JavaConverters._
import scala.compat.java8.FutureConverters
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future


class CourseController @Inject()(externalApi: ExternalCourseHandler, cache: SyncCacheApi)
  extends InjectedController with Authenticator with JsonResponder {

  override val sessionCache: SyncCacheApi = cache
  val CriteriaLengthLimiter = 2

  def listCourses(filterType: Option[String], criteria: Option[String], user: User): Future[Result] = {
    (filterType, criteria) match {
      case (Some("code"), Some(x)) =>
        FutureConverters.toScala(externalApi.getCoursesByCode(user, x)).map(i => java2Response(i))
      case (Some("name"), Some(x)) if x.length >= CriteriaLengthLimiter =>
        Future {
          Ebean.find(classOf[Course]).where
            .ilike("name", s"%$x%")
            .orderBy("code")
            .findList
        }.map(i => java2Response(i))
      case (Some("name"), Some(x)) =>
        throw new IllegalArgumentException("Too short criteria")
      case _ =>
        Future {
          Ebean.find(classOf[Course]).where.isNotNull("name").orderBy("code").findList
        }.map(i => java2Response(i))
    }
  }

  def getUserCourses(user: User, examIds: Option[List[Long]], sectionIds: Option[List[Long]],
                     tagIds: Option[List[Long]], token: String): Result = {
    var query = Ebean.find(classOf[Course]).where.isNotNull("name")
    if (!user.hasRole("ADMIN", getSession(token))) {
      query = query
        .eq("exams.examOwners", user)
    }
    if (examIds.isDefined && examIds.get.nonEmpty) {
      query = query.in("exams.id", examIds.get.asJava)
    }
    if (sectionIds.isDefined && sectionIds.get.nonEmpty) {
      query = query.in("exams.examSections.id", sectionIds.get.asJava)
    }
    if (tagIds.isDefined && tagIds.get.nonEmpty) {
      query = query.in("exams.examSections.sectionQuestions.question.parent.tags.id", tagIds.get.asJava)
    }
    val results = query.orderBy("name desc").findList
    Ok(Json.toJson(results).toString)
  }


  // Actions ->

  def getCourses(filterType: Option[String], criteria: Option[String]): Action[AnyContent] = Action.async {
    request =>
      request.headers.get(getAuthHeaderName).map { token =>
        getAuthorizedUser(token, Seq("ADMIN", "TEACHER")) match {
          case user: Any =>
            listCourses(filterType, criteria, user)
          case _ =>
            Future.successful(forbid())
        }
      }.getOrElse {
        Future.successful(forbid())
      }
  }

  def getCourse(id: Long): Action[AnyContent] = Action {
    request =>
      request.headers.get(getAuthHeaderName).map { token =>
        getAuthorizedUser(token, Seq("ADMIN", "TEACHER")) match {
          case user: Any =>
            val results = Ebean.find(classOf[Course], id)
            Ok(Json.toJson(results).toString)
          case _ =>
            forbid()
        }
      }.getOrElse {
        forbid()
      }
  }

  def listUsersCourses(examIds: Option[List[Long]], sectionIds: Option[List[Long]],
                       tagIds: Option[List[Long]]): Action[AnyContent] = Action {
    request =>
      request.headers.get(getAuthHeaderName).map { token =>
        getAuthorizedUser(token, Seq("ADMIN", "TEACHER")) match {
          case user: Any =>
            getUserCourses(user, examIds, sectionIds, tagIds, token)
          case _ =>
            forbid()
        }
      }.getOrElse {
        forbid()
      }
  }

}
