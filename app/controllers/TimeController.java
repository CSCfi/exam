package controllers;

import com.avaje.ebean.Ebean;
import models.ExamInspection;
import models.User;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.mvc.Controller;
import play.mvc.Result;


public class TimeController extends Controller {

    private static DateTimeFormatter format = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm");


    public static Result getTime() {
        return ok(DateTime.now().toString(format));
    }


    public static Result getExamRemainingTime(Long examId) {


        Ebean.find(ExamInspection.class);
        User user = UserController.getLoggedUser();
        final DateTime now = DateTime.now();





        return ok();


    }

}
