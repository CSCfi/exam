package controllers

import be.objectify.deadbolt.java.actions.{Group, Restrict}
import com.avaje.ebean.Ebean
import models.Course
import play.api.mvc.{Action, Controller}
import util.scala.ScalaHacks

object CourseController extends Controller with ScalaHacks {

  sealed trait FilterType

  case object FilterByName extends FilterType

  case object FilterByCode extends FilterType

  val CriteriaLengthLimiter = 2

  /*def getLoggedUser : User = {
    String token = request().getHeader(SITNET_TOKEN_HEADER_KEY);
      Session session = (Session) Cache.get(SITNET_CACHE_KEY + token);
    return Ebean.find(User.class, session.getUserId());
  }*/

  @Restrict(Array(new Group(Array("TEACHER")), new Group(Array("ADMIN"))))
  def getCourses(filterType: Option[FilterType], criteria: Option[String]) =
    Action {
      (filterType, criteria) match {
        case (Some(FilterByCode), Some(x)) =>
          Interfaces.getCourseInfo(x)
        case (Some(FilterByName), Some(x)) if x.size >= CriteriaLengthLimiter =>
          Ebean.find(classOf[Course]).where()
            .ilike("name", s"$x%")
            .orderBy("name desc")
            .findList()
        case (Some(FilterByName), Some(x)) =>
          throw new IllegalArgumentException("Too short criteria")
        case _ =>
          Ebean.find(classOf[Course]).findList
      }
    }

  @Restrict(Array(new Group(Array("TEACHER")), new Group(Array("ADMIN"))))
  def getCourse(id: Long) = Action {
    Ebean.find(classOf[Course], id)
  }

  @Restrict(Array(new Group(Array("TEACHER")), new Group(Array("ADMIN"))))
  def listUsersCourses(userId : Long) = Action {
        Ebean.find(classOf[Course]).where().eq("exams.creator.id", userId).orderBy("name desc").findList
  }

}