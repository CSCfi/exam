package controllers

import javax.inject.Inject

import com.avaje.ebean.Ebean
import models.{Course, User}
import play.api.cache.CacheApi
import play.api.mvc.{Action, Controller}
import play.libs.Json
import util.scala.{Authenticator, JsonResponder}

import scala.collection.JavaConverters._
import scala.compat.java8.FutureConverters
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future


class CourseController @Inject()(externalApi: ExternalAPI, cache: CacheApi) extends Controller
  with Authenticator with JsonResponder {

  override val sessionCache = cache
  val CriteriaLengthLimiter = 2

  def listCourses(filterType: Option[String], criteria: Option[String], user: User) = {
    (filterType, criteria) match {
      case (Some("code"), Some(x)) =>
        FutureConverters.toScala(externalApi.getCourseInfoByCode(user, x)).map(i => java2Response(i))
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

  def getUserCourses(user: User, examIds: Option[List[Long]], sectionIds: Option[List[Long]], tagIds: Option[List[Long]], token: String) = {
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

  def getCourses(filterType: Option[String], criteria: Option[String]) = Action.async {
    request => request.headers.get(getKey).map { token =>
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

  def getCourse(id: Long) = Action {
    request => request.headers.get(getKey).map { token =>
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

  def listUsersCourses(examIds: Option[List[Long]], sectionIds: Option[List[Long]], tagIds: Option[List[Long]]) = Action {
    request => request.headers.get(getKey).map { token =>
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
