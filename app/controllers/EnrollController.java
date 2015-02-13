package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import models.Exam;
import models.ExamEnrolment;
import models.Reservation;
import models.User;
import org.joda.time.DateTime;
import play.mvc.Controller;
import play.mvc.Result;

import java.util.Date;
import java.util.List;

public class EnrollController extends Controller {

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public static Result enrollExamList(String code) {

        List<Exam> activeExams = Ebean.find(Exam.class)
                .where()
                .eq("course.code", code)
                .eq("state", "PUBLISHED")
                .ge("examActiveEndDate", new Date())
                .findList();
        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, name, course, examActiveStartDate, examActiveEndDate, enrollInstruction, " +
                "creator, examLanguages");
        options.setPathProperties("course", "code");
        options.setPathProperties("creator", "firstName, lastName, organization");
        options.setPathProperties("examLanguages", "code, name");

        return ok(jsonContext.toJsonString(activeExams, true, options)).as("application/json");
    }

    @Restrict({@Group("ADMIN")})
    public static Result enrolmentsByReservation(Long id) {

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("user")
                .fetch("exam")
                .fetch("reservation")
                .where()
                .eq("reservation.id", id)
                .findList();

        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, exam, user, reservation");
        options.setPathProperties("exam", "id, name, course, examActiveStartDate, examActiveEndDate");
        options.setPathProperties("exam.course", "code, name");
        options.setPathProperties("user", "firstName, lastName, email");
        options.setPathProperties("reservation", "id, startAt, endAt");

        return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public static Result enrollExamInfo(String code, Long id) {

        Exam exam = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("examLanguages")
                .where()
                .eq("course.code", code)
                .eq("id", id)
                .findUnique();

        //Set general info visible
        exam.setExpanded(true);

        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, name, examActiveStartDate, examActiveEndDate, duration, "
                + "grading, course, creator, expanded, examType, enrollInstruction, examLanguages, " +
                "answerLanguage");
        options.setPathProperties("examType", "type");
        options.setPathProperties("course", "code, name, level, type, credits");
        options.setPathProperties("creator", "firstName, lastName, email");
        options.setPathProperties("examLanguages", "code, name");

        return ok(jsonContext.toJsonString(exam, true, options)).as("application/json");
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public static Result createEnrolment(String code, Long id) {

        User user = UserController.getLoggedUser();

        Exam exam = Ebean.find(Exam.class)
                .where()
                .eq("course.code", code)
                .eq("id", id)
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }

        // check if enrolment already exists?
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .where()
                .eq("user.id", user.getId())
                .eq("exam.id", exam.getId())
                .findUnique();

        // remove old one
        if (enrolment != null) {
            Reservation reservation = enrolment.getReservation();
            // Check that user has no ongoing reservation for this enrolment
            if (reservation != null && reservation.toInterval().contains(DateTime.now())) {
                return forbidden("sitnet_reservation_in_effect");
            }
            enrolment.delete();
        }

        enrolment = new ExamEnrolment();
        enrolment.setEnrolledOn(new Date());
        enrolment.setUser(user);
        enrolment.setExam(exam);
        enrolment.save();

        return ok();
    }

}
