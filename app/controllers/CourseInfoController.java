package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Course;
import play.libs.F;
import play.libs.Json;
import play.mvc.Action;
import play.mvc.Result;

import javax.inject.Inject;
import java.net.MalformedURLException;


public class CourseInfoController extends BaseController {

    @Inject
    protected ExternalAPI externalAPI;

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public F.Promise<Result> insertCourseFromInterface(String code) throws MalformedURLException {
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
        return externalAPI.getCourseInfoByCode(getLoggedUser(), code)
                .map(courses -> {
                    if (courses.isEmpty()) {
                        return null;
                    }
                    Course first = courses.get(0);
                    first.save();
                    return first;
                })
                .map(foundCourse -> foundCourse == null ? notFound() : ok(Json.toJson(foundCourse)))
                .recover(throwable -> internalServerError(throwable.getMessage()));
    }
}
