package controllers;


import com.google.inject.ImplementedBy;
import models.Course;
import models.User;
import play.libs.F;
import play.mvc.Result;

import java.net.MalformedURLException;
import java.util.Collection;
import java.util.List;

@ImplementedBy(Interfaces.class)
public interface ExternalAPI {
    F.Promise<Collection<String>> getPermittedCourses(User user) throws MalformedURLException;
    F.Promise<List<Course>> getCourseInfoByCode(String code) throws MalformedURLException;
    Result getNewRecords(String startDate);
    Result getNewRecordsAlphabeticKeyOrder(String startDate);

}
