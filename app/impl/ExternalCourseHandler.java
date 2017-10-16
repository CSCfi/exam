package impl;

import com.google.inject.ImplementedBy;
import models.Course;
import models.User;

import java.io.IOException;
import java.util.Collection;
import java.util.Set;
import java.util.concurrent.CompletionStage;

@ImplementedBy(ExternalCourseHandlerImpl.class)
public interface ExternalCourseHandler {
    CompletionStage<Set<Course>> getCoursesByCode(User user, String code) throws IOException;
    CompletionStage<Collection<String>> getPermittedCourses(User user) throws IOException;
}
