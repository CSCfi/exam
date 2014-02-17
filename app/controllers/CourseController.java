package controllers;

import java.util.List;

import models.Course;
import play.libs.Json;
import play.mvc.Result;

import com.avaje.ebean.Ebean;

public class CourseController extends SitnetController {

	
//  @Authenticate
  public static Result getCourses() {
  	
  	
      List<Course> courses = Ebean.find(Course.class).findList();
      return ok(Json.toJson(courses));
  }
	
}
