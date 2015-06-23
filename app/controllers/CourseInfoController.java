package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Course;
import play.libs.F;
import play.libs.Json;
import play.mvc.Action;
import play.mvc.Result;

import java.net.MalformedURLException;
import java.util.List;


public class CourseInfoController extends SitnetController {

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static F.Promise<Result> insertCourseFromInterface(String code) throws MalformedURLException {
        if (code.isEmpty()) {
            return wrapAsPromise(Action.notFound("sitnet_course_not_found"));
        }

        // check that course does not exist
        Course course = Ebean.find(Course.class)
                .where()
                .eq("code", code)
                .findUnique();
        if (course != null) {
            return wrapAsPromise(Action.ok(Json.toJson(course)));
        }

        // get it through remote interface
        return Interfaces.getCourseInfoByCode(code).map(new F.Function<List<Course>, Course>() {
            @Override
            public Course apply(List<Course> courses) throws Throwable {
                if (courses.isEmpty()) {
                    return null;
                }
                Course first = courses.get(0);
                first.save();
                return first;
            }
        }).map(new F.Function<Course, Result>() {
            @Override
            public Result apply(Course course) throws Throwable {
                return course == null ? notFound() : ok(Json.toJson(course));
            }
        }).recover(new F.Function<Throwable, Result>() {
            @Override
            public Result apply(Throwable throwable) throws Throwable {
                return internalServerError(throwable.getMessage());
            }
        });
    }
}
