package controllers

import com.avaje.ebean.Ebean
import models.Course
import play.api.mvc.{Controller, Action}
import util.ScalaHacks

object CourseController extends Controller with ScalaHacks {

  def getCourses = Action {
    val courses = Ebean.find(classOf[Course]).findList
    java2Response(courses)
  }

  def getCourse(id: Long) = Action {
    val course = Ebean.find(classOf[Course], id)
    java2Response(course)
  }

}