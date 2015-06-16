package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import com.fasterxml.jackson.databind.JsonNode;
import models.Exam;
import models.ExamEnrolment;
import models.Reservation;
import models.User;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.F;
import play.mvc.Result;
import util.AppUtil;

import java.net.MalformedURLException;
import java.util.Collection;
import java.util.Date;
import java.util.List;

public class EnrollController extends SitnetController {

    private static final boolean PERM_CHECK_ACTIVE = AppUtil.isEnrolmentPermissionCheckActive();

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
                "creator, examLanguages, examOwners, examInspections");
        options.setPathProperties("examInspections", "id, user");
        options.setPathProperties("examInspections.user", "firstName, lastName");
        options.setPathProperties("course", "code");
        options.setPathProperties("examOwners", "firstName, lastName");
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
        options.setPathProperties("exam", "id, name, course, examActiveStartDate, examActiveEndDate, examOwners");
        options.setPathProperties("exam.course", "code, name");
        options.setPathProperties("exam.examOwners", "firstName, lastName");
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
                + "gradeScale, course, creator, expanded, examType, enrollInstruction, examLanguages, " +
                "answerLanguage, examOwners, examInspections");
        options.setPathProperties("examInspections", "id, user");
        options.setPathProperties("examInspections.user", "firstName, lastName");
        options.setPathProperties("examType", "type");
        options.setPathProperties("examOwners", "firstName, lastName");
        options.setPathProperties("examLanguages", "code");
        options.setPathProperties("gradeScale", "id, description");
        options.setPathProperties("course", "code, name, level, type, credits, organisation");
        options.setPathProperties("course.organisation", "name");
        options.setPathProperties("creator", "firstName, lastName, email");
        options.setPathProperties("examLanguages", "code, name");

        return ok(jsonContext.toJsonString(exam, true, options)).as("application/json");
    }

    private static void makeEnrolment(Exam exam, User user) {
        ExamEnrolment enrolment = new ExamEnrolment();
        enrolment.setEnrolledOn(new Date());
        enrolment.setUser(user);
        enrolment.setExam(exam);
        enrolment.save();
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public static Result checkIfEnrolled(Long id) {
        DateTime now = AppUtil.adjustDST(new DateTime());
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .where()
                .eq("user.id", UserController.getLoggedUser().getId())
                .eq("exam.id", id)
                .gt("exam.examActiveEndDate", now.toDate())
                .disjunction()
                .gt("reservation.endAt", now.toDate())
                .isNull("reservation")
                .endJunction()
                .disjunction()
                .eq("exam.state", "PUBLISHED")
                .eq("exam.state", "STUDENT_STARTED")
                .endJunction()
                .findList();
        if (enrolments.isEmpty()) {
            return notFound();
        }
        return ok();
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public static Result removeEnrolment(Long id) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class, id);
        if (enrolment.getReservation() != null) {
            return forbidden("sitnet_cancel_reservation_first");
        }
        enrolment.delete();
        return ok();
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public static Result updateEnrolment(Long id) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class, id);
        if (enrolment == null) {
            return notFound("enrolment not found");
        }
        JsonNode json = request().body().asJson();
        String info = json.get("information").asText();
        enrolment.setInformation(info);
        enrolment.update();
        return ok();
    }

    private static Result doCreateEnrolment(String code, Long id) {
        User user = UserController.getLoggedUser();
        Exam exam = Ebean.find(Exam.class)
                .where()
                .eq("course.code", code)
                .eq("id", id)
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("user.id", user.getId())
                        // either exam ID matches OR (exam parent ID matches AND exam is started by student)
                .disjunction()
                .eq("exam.id", exam.getId())
                .disjunction()
                .conjunction()
                .eq("exam.parent.id", exam.getId())
                .eq("exam.state", Exam.State.STUDENT_STARTED.toString())
                .endJunction()
                .endJunction()
                .endJunction()
                .findList();

        for (ExamEnrolment enrolment : enrolments) {
            Reservation reservation = enrolment.getReservation();
            if (reservation == null) {
                // enrolment without reservation already exists, no need to create a new one
                return forbidden("sitnet_error_enrolment_exists");
            } else if (reservation.toInterval().contains(AppUtil.adjustDST(DateTime.now(), reservation))) {
                // reservation in effect
                if (exam.getState().equals(Exam.State.STUDENT_STARTED.toString())) {
                    // exam for reservation is ongoing
                    return forbidden("sitnet_reservation_in_effect");
                } else if (exam.getState().equals(Exam.State.PUBLISHED.toString())) {
                    // exam for reservation not started (yet?)
                    // TODO: somehow mark this as a no-show after confirmation, but for now just forbid it
                    return forbidden("sitnet_reservation_in_effect");
                }
            } else if (reservation.toInterval().isAfterNow()) {
                // reservation in the future, replace it
                enrolment.delete();
            }
        }
        makeEnrolment(exam, user);
        return ok();
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public static F.Promise<Result> createEnrolment(final String code, final Long id) throws MalformedURLException {
        if (!PERM_CHECK_ACTIVE) {
            return wrapAsPromise(doCreateEnrolment(code, id));
        }
        F.Promise<Collection<String>> promise = Interfaces.getPermittedCourses(UserController.getLoggedUser());
        return promise.map(new F.Function<Collection<String>, Result>() {
            @Override
            public Result apply(Collection<String> codes) throws Throwable {
                if (codes.contains(code)) {
                    return doCreateEnrolment(code, id);
                } else {
                    Logger.warn("Attempt to enroll for a course without permission from {}", UserController.getLoggedUser().toString());
                    return forbidden("sitnet_error_access_forbidden");
                }
            }
        }).recover(new F.Function<Throwable, Result>() {
            @Override
            public Result apply(Throwable throwable) throws Throwable {
                return internalServerError(throwable.getMessage());
            }
        });
    }

}
