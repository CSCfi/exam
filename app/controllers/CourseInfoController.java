package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Course;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;

/**
 * Created by Mikko Katajamaki on 04/12/14.
 */
public class CourseInfoController extends SitnetController {


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result insertCourseFromInterface(String code) {

        if(code == null || code.isEmpty()) {
            return notFound("sitnet_course_not_found");
        }

        // check that course do not exits
        Course course = Ebean.find(Course.class)
                .where()
                .eq("code", code)
                .findUnique();

        if(course != null) {
            return ok(Json.toJson(course));
        }

        // get list from interface
        List<Course> courseList = null;
        try {
            // actually should return only one course. gets the first one
            courseList = Interfaces.getCourseInfo(code);
            course = courseList.get(0);

            if(courseList == null ||
                    course == null ||
                    course.getIdentifier().isEmpty() ||
                    course.getName().isEmpty()) {
                return notFound("sitnet_course_not_found");
            }
        } catch (Exception e) {
            return notFound();
        }

        course.save();
        return ok(Json.toJson(course));
    }
}
