package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.ExamEnrolment;
import models.User;
import org.joda.time.DateTime;
import org.joda.time.Seconds;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.mvc.Controller;
import play.mvc.Result;


public class TimeController extends Controller {

    private static DateTimeFormatter format = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm");


    @Restrict({@Group("STUDENT")})
    public static Result getTime() {
        return ok(DateTime.now().toString(format));
    }


    @Restrict({@Group("STUDENT")})
    public static Result getExamRemainingTime(Long examId) {

        User user = UserController.getLoggedUser();
        if (user == null) {
            return forbidden("sitnet_error_invalid_session");
        }

        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("exam")
                .where()
                .eq("exam.id", examId)
                .eq("user.id", user.getId())
                .findUnique();

        if (enrolment == null) {
            return notFound();
        }

        final DateTime reservationStart = new DateTime(enrolment.getReservation().getStartAt());
        final int durationMinutes = enrolment.getExam().getDuration();
        final Seconds timeLeft = Seconds.secondsBetween(DateTime.now(), reservationStart.plusMinutes(durationMinutes));

        return ok(String.valueOf(timeLeft.getSeconds()));
    }

}
