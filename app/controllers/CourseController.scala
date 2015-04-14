package controllers

import be.objectify.deadbolt.java.actions.{Group, Restrict}
import com.avaje.ebean.Ebean
import models.{Course, User}
import play.api.mvc.{Action, Controller}
import util.scala.Binders.IdList
import util.scala.ScalaHacks

import scala.collection.JavaConverters._

object CourseController extends Controller with ScalaHacks {

  sealed trait FilterType

  case object FilterByName extends FilterType

  case object FilterByCode extends FilterType

  val CriteriaLengthLimiter = 2

  @Restrict(Array(new Group(Array("TEACHER")), new Group(Array("ADMIN"))))
  def getCourses(filterType: Option[String], criteria: Option[String]) = Action {
    (filterType, criteria) match {
      case (Some("code"), Some(x)) =>
        Interfaces.getCourseInfo(x)
      case (Some("name"), Some(x)) if x.size >= CriteriaLengthLimiter =>
        Ebean.find(classOf[Course]).where()
          .ilike("name", s"$x%")
          .orderBy("name desc")
          .findList()
      case (Some("name"), Some(x)) =>
        throw new IllegalArgumentException("Too short criteria")
      case _ =>
        Ebean.find(classOf[Course]).findList()
    }
  }

  @Restrict(Array(new Group(Array("TEACHER")), new Group(Array("ADMIN"))))
  def getCourse(id: Long) = Action {
    Ebean.find(classOf[Course], id)
  }

  @Restrict(Array(new Group(Array("TEACHER")), new Group(Array("ADMIN"))))
  def listUsersCourses(userId: Long, examIds: Option[IdList], sectionIds: Option[IdList], tagIds: Option[IdList]) = Action {
    val user = Ebean.find(classOf[User], userId)
    var query = Ebean.find(classOf[Course]).where
    if (!user.hasRole("ADMIN")) query = query.eq("exams.creator.id", userId)
    if (examIds.isDefined && examIds.get.size > 0) {
      query = query.in("exams.id", examIds.get.asJava)
    }
    if (sectionIds.isDefined && sectionIds.get.size > 0) {
      query = query.in("exams.examSections.id", sectionIds.get.asJava)
    }
    if (tagIds.isDefined && tagIds.get.size > 0) {
      query = query.in("exams.examSections.sectionQuestions.question.parent.tags.id", tagIds.get.asJava)
    }
    query.orderBy("name desc").findList
  }

}