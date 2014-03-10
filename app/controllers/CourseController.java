package controllers;

import com.avaje.ebean.Ebean;
import models.Course;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;

public class CourseController extends SitnetController {

	
//  @Authenticate
  public static Result getCourses() {
  	
	  // TODO: tänne tehään Interface ja stub joka matkii oodi interfacea
  	
      List<Course> courses = Ebean.find(Course.class).findList();
      return ok(Json.toJson(courses));
  }
	
}
