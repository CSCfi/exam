package util.java;

import com.google.inject.ImplementedBy;
import models.Course;
import models.User;
import play.mvc.Result;

import java.io.IOException;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.CompletionStage;

@ImplementedBy(ExternalCourseHandlerImpl.class)
public interface ExternalCourseHandler {
    CompletionStage<List<Course>> getCoursesByCode(User user, String code) throws IOException;
    CompletionStage<Result> updateCourses() throws IOException;
    CompletionStage<Collection<String>> getPermittedCourses(User user) throws IOException;
}
