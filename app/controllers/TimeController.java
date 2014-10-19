package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamEnrolment;
import models.ExamParticipation;
import models.User;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Minutes;
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

        User user = null;
        try {
            user = UserController.getLoggedUser();
        } catch (Exception ex) {
        }

        if (user == null) {
            return forbidden("invalid session");
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

        final DateTime now =  DateTime.now().plus(DateTimeZone.forID("Europe/Helsinki").getOffset(DateTime.now()));
        final Seconds timeLeft = Seconds.secondsBetween(now, new DateTime(enrolment.getReservation().getEndAt()));

        return ok(String.valueOf(timeLeft.getSeconds()));
    }

}
