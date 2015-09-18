package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import models.*;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.F;
import play.mvc.Result;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.net.MalformedURLException;
import java.util.Collection;
import java.util.Date;
import java.util.List;

public class EnrollController extends BaseController {

    private static final boolean PERM_CHECK_ACTIVE = AppUtil.isEnrolmentPermissionCheckActive();

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ExternalAPI externalAPI;

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result enrollExamList(String code) {

        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("creator", "firstName, lastName")
                .fetch("examLanguages")
                .fetch("examOwners", "firstName, lastName")
                .fetch("course", "code, name")
                .where()
                .eq("course.code", code)
                .eq("state", Exam.State.PUBLISHED)
                .ge("examActiveEndDate", new Date())
                .findList();

        return ok(exams);
    }

    @Restrict({@Group("ADMIN")})
    public Result enrolmentsByReservation(Long id) {

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("user", "firstName, lastName, email")
                .fetch("exam")
                .fetch("exam.course", "code, name")
                .fetch("exam.examOwners", "firstName, lastName")
                .fetch("reservation", "id, startAt, endAt")
                .where()
                .eq("reservation.id", id)
                .findList();
        return ok(enrolments);
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result enrollExamInfo(String code, Long id) {

        Exam exam = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("course.organisation")
                .fetch("gradeScale")
                .fetch("creator", "firstName, lastName, email")
                .fetch("examLanguages")
                .fetch("examOwners", "firstName, lastName")
                .fetch("examInspections")
                .fetch("examInspections.user")
                .fetch("examType")
                .where()
                .eq("course.code", code)
                .idEq(id)
                .findUnique();

        //FIXME: should not be handled server-side
        // Set general info visible
        exam.setExpanded(true);
        return ok(exam);
    }

    private static ExamEnrolment makeEnrolment(Exam exam, User user) {
        ExamEnrolment enrolment = new ExamEnrolment();
        enrolment.setEnrolledOn(new Date());
        enrolment.setUser(user);
        enrolment.setExam(exam);
        enrolment.save();
        return enrolment;
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result checkIfEnrolled(Long id) {
        DateTime now = AppUtil.adjustDST(new DateTime());
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .where()
                .eq("user.id", getLoggedUser().getId())
                .eq("exam.id", id)
                .gt("exam.examActiveEndDate", now.toDate())
                .disjunction()
                .gt("reservation.endAt", now.toDate())
                .isNull("reservation")
                .endJunction()
                .disjunction()
                .eq("exam.state", Exam.State.PUBLISHED)
                .eq("exam.state", Exam.State.STUDENT_STARTED)
                .endJunction()
                .findList();
        if (enrolments.isEmpty()) {
            return notFound();
        }
        return ok();
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result removeEnrolment(Long id) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).fetch("exam")
                .where().idEq(id).findUnique();
        // Disallow removing enrolments to private exams created automatically for student
        if (enrolment.getExam().isPrivate()) {
            return forbidden();
        }
        if (enrolment.getReservation() != null ) {
            return forbidden("sitnet_cancel_reservation_first");
        }
        enrolment.delete();
        return ok();
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result updateEnrolment(Long id) {
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

    private Result doCreateEnrolment(Long eid, Long uid, ExamExecutionType.Type type) {
        User user = uid == null ? getLoggedUser() : Ebean.find(User.class, uid);
        Exam exam = Ebean.find(Exam.class)
                .where()
                .eq("id", eid)
                .eq("executionType.type", type.toString())
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
                .eq("exam.state", Exam.State.STUDENT_STARTED)
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
                if (exam.getState() == Exam.State.STUDENT_STARTED) {
                    // exam for reservation is ongoing
                    return forbidden("sitnet_reservation_in_effect");
                } else if (exam.getState() == Exam.State.PUBLISHED) {
                    // exam for reservation not started (yet?)
                    return forbidden("sitnet_reservation_in_effect");
                }
            } else if (reservation.toInterval().isAfterNow()) {
                // reservation in the future, replace it
                enrolment.delete();
            }
        }
        ExamEnrolment newEnrolment = makeEnrolment(exam, user);
        return ok(newEnrolment);
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public F.Promise<Result> createEnrolment(final String code, final Long id) throws MalformedURLException {
        if (!PERM_CHECK_ACTIVE) {
            return wrapAsPromise(doCreateEnrolment(id, null, ExamExecutionType.Type.PUBLIC));
        }
        final User user = getLoggedUser();
        F.Promise<Collection<String>> promise = externalAPI.getPermittedCourses(user);
        return promise.map(codes -> {
            if (codes.contains(code)) {
                return doCreateEnrolment(id, null, ExamExecutionType.Type.PUBLIC);
            } else {
                Logger.warn("Attempt to enroll for a course without permission from {}", user.toString());
                return forbidden("sitnet_error_access_forbidden");
            }
        }).recover(throwable -> internalServerError(throwable.getMessage()));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result createStudentEnrolment(Long eid, Long uid) {
        return doCreateEnrolment(eid, uid, ExamExecutionType.Type.PRIVATE);
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result removeStudentEnrolment(Long id) {
        User user = getLoggedUser();
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where()
                .idEq(id)
                .eq("exam.executionType.type", ExamExecutionType.Type.PRIVATE.toString())
                .isNull("reservation")
                .disjunction()
                .eq("exam.state", Exam.State.DRAFT)
                .eq("exam.state", Exam.State.SAVED)
                .endJunction()
                .disjunction()
                .eq("exam.examOwners", user)
                .eq("exam.creator", user)
                .endJunction()
                .findUnique();
        if (enrolment == null) {
            return forbidden("sitnet_not_possible_to_remove_participant");
        }
        enrolment.delete();
        return ok();
    }

}
