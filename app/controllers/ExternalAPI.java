package controllers;


import com.google.inject.ImplementedBy;
import models.Course;
import models.User;

import java.net.MalformedURLException;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.CompletionStage;

@ImplementedBy(IntegrationController.class)
public interface ExternalAPI {
    CompletionStage<Collection<String>> getPermittedCourses(User user) throws MalformedURLException;
    CompletionStage<List<Course>> getCourseInfoByCode(User user, String code) throws MalformedURLException;
}
