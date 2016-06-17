package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Course;
import play.libs.Json;
import play.mvc.Action;
import play.mvc.Result;

import javax.inject.Inject;
import java.net.MalformedURLException;
import java.util.concurrent.CompletionStage;


public class CourseInfoController extends BaseController {

    @Inject
    protected ExternalAPI externalAPI;

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> insertCourseFromInterface(String code) throws MalformedURLException {
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
                .thenApplyAsync(courses -> {
                    if (courses.isEmpty()) {
                        return notFound();
                    }
                    Course first = courses.get(0);
                    first.save();
                    return ok(Json.toJson(first));
                })
                .exceptionally(throwable -> internalServerError(throwable.getMessage()));
    }
}
