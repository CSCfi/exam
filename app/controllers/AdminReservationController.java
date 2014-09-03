package controllers;

import Exceptions.MalformedDataException;
import Exceptions.NotFoundException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import models.*;
import org.joda.time.DateMidnight;
import org.joda.time.DateTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Play;
import play.libs.Json;
import play.mvc.Result;
import util.java.EmailComposer;

import java.sql.Timestamp;
import java.util.Date;
import java.util.List;


public class AdminReservationController extends SitnetController {

    private static final String playPath = Play.application().path().getAbsolutePath();


    @Restrict({@Group("ADMIN")})
    public static Result getExams() {

        Timestamp now = new Timestamp(new Date().getTime());

        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("parent")
                .where()
                .eq("parent", null) // only Exam prototypes
                .eq("state", "PUBLISHED")
                .gt("examActiveEndDate", now)   // Students should be able to enroll, before exam starts.
                .findList();

        if (exams == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, name");

            return ok(jsonContext.toJsonString(exams, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("ADMIN")})
    public static Result getExamRooms() {

        List<ExamRoom> examRooms = Ebean.find(ExamRoom.class)
                .findList();

        if (examRooms == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, name");

            return ok(jsonContext.toJsonString(examRooms, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("ADMIN")})
    public static Result getStudents() {

        List<User> students = Ebean.find(User.class)
                .where()
                .eq("roles.name", "STUDENT")
                .findList();

        if (students == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, firstName, lastName");

            return ok(jsonContext.toJsonString(students, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("ADMIN")})
    public static Result removeReservation(long id) throws MalformedDataException, NotFoundException {

        //todo: email trigger: remove reservation
        final ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .where()
                .eq("reservation.id", id)
                .findUnique();
        if (enrolment == null) {
            throw new NotFoundException(String.format("No reservation with id  {} for current user.", id));
        }
        Reservation reservation = enrolment.getReservation();
        User student = enrolment.getUser();
        EmailComposer.composeReservationCancelationNotification(student, reservation, "");

        enrolment.setReservation(null);
        Ebean.save(enrolment);
        Ebean.delete(Reservation.class, id);
        Ebean.delete(enrolment);

        return ok("removed");
    }

    @Restrict({@Group("ADMIN")})
    public static Result getReservations(Long studentId, Long roomId, Long examId ) {


        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("user")
                .fetch("exam")
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("user.id", studentId)
                .eq("reservation.machine.room.id", roomId)
                .eq("exam.id", examId)
                .findList();

        if (enrolments == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, enrolledOn, user, exam, reservation");
            options.setPathProperties("user", "id, firstName, lastName");
            options.setPathProperties("exam", "id, name");
            options.setPathProperties("reservation", "id, startAt, endAt, machine");
            options.setPathProperties("reservation.machine", "id, name, ipAddress, room");
            options.setPathProperties("reservation.machine.room", "id, name, roomCode");

            return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("ADMIN")})
    public static Result getReservationsByStudent(Long studentId, String start, String end) {

        long startTimestamp = Long.parseLong(start);
        long endTimestamp = Long.parseLong(end);

        DateMidnight startDate = new DateMidnight(startTimestamp);
        DateTime endDate = new DateMidnight(endTimestamp).plusDays(1).toDateTime();

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("user")
                .fetch("exam")
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("user.id", studentId)
                .ge("reservation.startAt", startDate)
                .lt("reservation.endAt", endDate)
                .findList();

        if (enrolments == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, enrolledOn, user, exam, reservation");
            options.setPathProperties("user", "id, firstName, lastName");
            options.setPathProperties("exam", "id, name");
            options.setPathProperties("reservation", "id, startAt, endAt, machine");
            options.setPathProperties("reservation.machine", "id, name, ipAddress, room");
            options.setPathProperties("reservation.machine.room", "id, name, roomCode");

            return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("ADMIN")})
    public static Result getReservationsByRoom(Long roomId, String start, String end) {

        long startTimestamp = Long.parseLong(start);
        long endTimestamp = Long.parseLong(end);

        DateMidnight startDate = new DateMidnight(startTimestamp);
        DateTime endDate = new DateMidnight(endTimestamp).plusDays(1).toDateTime();

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("user")
                .fetch("exam")
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("reservation.machine.room.id", roomId)
                .ge("reservation.startAt", startDate)
                .lt("reservation.endAt", endDate)
                .findList();

        if (enrolments == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, enrolledOn, user, exam, reservation");
            options.setPathProperties("user", "id, firstName, lastName");
            options.setPathProperties("exam", "id, name");
            options.setPathProperties("reservation", "id, startAt, endAt, machine");
            options.setPathProperties("reservation.machine", "id, name, ipAddress, room");
            options.setPathProperties("reservation.machine.room", "id, name, roomCode");

            return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("ADMIN")})
    public static Result getReservationsByExam(Long examId, String start, String end ) {

        long startTimestamp = Long.parseLong(start);
        long endTimestamp = Long.parseLong(end);

        DateMidnight startDate = new DateMidnight(startTimestamp);
        DateTime endDate = new DateMidnight(endTimestamp).plusDays(1).toDateTime();

        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("user")
                .fetch("exam")
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("exam.id", examId)
                .ge("reservation.startAt", startDate)
                .lt("reservation.endAt", endDate)
                .findList();

        if (enrolments == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, enrolledOn, user, exam, reservation");
            options.setPathProperties("user", "id, firstName, lastName");
            options.setPathProperties("exam", "id, name");
            options.setPathProperties("reservation", "id, startAt, endAt, machine");
            options.setPathProperties("reservation.machine", "id, name, ipAddress, room");
            options.setPathProperties("reservation.machine.room", "id, name, roomCode");

            return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
        }
    }
}
