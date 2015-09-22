package controllers

import javax.inject.Inject

import be.objectify.deadbolt.java.actions.{Group, Restrict}
import com.avaje.ebean.Ebean
import models.{Course, Session, User}
import play.api.cache.CacheApi
import play.api.mvc.{Action, Controller}
import play.libs.Json
import util.scala.Binders.IdList
import util.scala.ScalaHacks

import scala.collection.JavaConverters._
import scala.concurrent.ExecutionContext.Implicits.global

class CourseController @Inject()(externalApi: ExternalAPI, cache: CacheApi) extends Controller with ScalaHacks {

  val CriteriaLengthLimiter = 2
  val SITNET_TOKEN_HEADER_KEY = "x-exam-authentication"
  val SITNET_CACHE_KEY = "user.session."

  def getSession(token: String) = {
    cache.getOrElse[Session](SITNET_CACHE_KEY + token) {
      null
    }
  }

  @Restrict(Array(new Group(Array("TEACHER")), new Group(Array("ADMIN"))))
  def getCourses(filterType: Option[String], criteria: Option[String]) = Action.async {
    (filterType, criteria) match {
      case (Some("code"), Some(x)) =>
        externalApi.getCourseInfoByCode(x).wrapped.map(i => java2Response(i))
      case (Some("name"), Some(x)) if x.length >= CriteriaLengthLimiter =>
        val courses = scala.concurrent.Future {
          Ebean.find(classOf[Course]).where
            .ilike("name", s"$x%")
            .orderBy("name desc")
            .findList
        }
        courses.map(i => java2Response(i))
      case (Some("name"), Some(x)) =>
        throw new IllegalArgumentException("Too short criteria")
      case _ =>
        val results = scala.concurrent.Future {
          Ebean.find(classOf[Course]).where.isNotNull("name").findList
        }
        results.map(i => java2Response(i))
    }
  }

  @Restrict(Array(new Group(Array("TEACHER")), new Group(Array("ADMIN"))))
  def getCourse(id: Long) = Action {
    Ebean.find(classOf[Course], id)
  }

  @Restrict(Array(new Group(Array("TEACHER")), new Group(Array("ADMIN"))))
  def listUsersCourses(userId: Long, examIds: Option[IdList], sectionIds: Option[IdList], tagIds: Option[IdList]) = Action {
    request => request.headers.get(SITNET_TOKEN_HEADER_KEY).map { token =>
      val user = Ebean.find(classOf[User], userId)
      var query = Ebean.find(classOf[Course]).where.isNotNull("name")
      if (!user.hasRole("ADMIN", getSession(token))) query = query.eq("exams.creator.id", userId)
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
      Ok(Json.toJson(results).toString).withHeaders(CONTENT_TYPE -> "application/json")
    }.getOrElse {
      Unauthorized
    }
  }

}