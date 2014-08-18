package controllers;

import play.mvc.Result;

/**
 * Created by avainik on 8/15/14.
 */
public class StatisticsController extends SitnetController {


//    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getActiveExams(Long roomId ) {




//        JsonContext jsonContext = Ebean.createJsonContext();
//        JsonWriteOptions options = new JsonWriteOptions();
//        options.setRootPathProperties("id, name, course, examActiveStartDate, examActiveEndDate");
//        options.setPathProperties("course", "code");
//
//        return ok(jsonContext.toJsonString(activeExams, true, options)).as("application/json");
        return ok();
    }
}
