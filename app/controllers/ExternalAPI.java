package controllers;


import com.google.inject.ImplementedBy;
import models.Course;
import models.User;
import play.libs.F;

import java.net.MalformedURLException;
import java.util.Collection;
import java.util.List;

@ImplementedBy(Interfaces.class)
public interface ExternalAPI {
    F.Promise<Collection<String>> getPermittedCourses(User user) throws MalformedURLException;
    F.Promise<List<Course>> getCourseInfoByCode(User user, String code) throws MalformedURLException;
}
