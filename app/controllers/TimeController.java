package controllers;

import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamParticipation;
import models.User;
import org.joda.time.DateTime;
import org.joda.time.Minutes;
import org.joda.time.Seconds;
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
        User user = UserController.getLoggedUser();

        ExamParticipation participation = Ebean.find(ExamParticipation.class)
                .fetch("user")
                .fetch("exam")
                .where()
                .eq("exam.id", examId)
                .eq("user.id", user.getId())
                .findUnique();

        if(participation == null) {
            return notFound();
        }

        Exam exam = participation.getExam();

        final Seconds examDuration = Minutes.minutes(exam.getDuration()).toStandardSeconds();
        final DateTime now = DateTime.now();
        final DateTime started = new DateTime(participation.getStarted());
        final Seconds tau = Seconds.secondsBetween(started, now);

        return ok(String.valueOf(examDuration.minus(tau).getSeconds()));
    }

}
