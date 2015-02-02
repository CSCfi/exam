package controllers;

import exceptions.MalformedDataException;
import exceptions.NotFoundException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import org.joda.time.DateMidnight;
import org.joda.time.DateTime;
import play.libs.Json;
import play.mvc.Result;
import util.java.EmailComposer;

import java.util.Date;
import java.util.List;


public class AdminReservationController extends SitnetController {

    @Restrict({@Group("ADMIN")})
    public static Result getExams() {

        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("parent")
                .where()
                .eq("parent", null) // only Exam prototypes
                .eq("state", "PUBLISHED")
                .gt("examActiveEndDate", new Date())   // Students should be able to enroll, before exam starts.
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

//        List<HakaAttribute> attr = Ebean.find(HakaAttribute.class)
//                .where()
//                .eq("user_id", u.getId())
//                .like("key", "schacPersonalUniqueCode")
//                .findList();
//
//        for (HakaAttribute a : attr) {
//            part.put(a.getKey(), a.getValue());
//        }

        ArrayNode array = JsonNodeFactory.instance.arrayNode();
        for (User u : students) {
            ObjectNode part = Json.newObject();
            part.put("id", u.getId());
            part.put("firstName", u.getFirstName());
            part.put("lastName", u.getLastName());
//        	part.put("schacPersonalUniqueCode", u.getAttributes().get("schacPersonalUniqueCode"));
//        	part.put("schacPersonalUniqueCode", u.getAttributes().get("schacPersonalUniqueCode"));

//            List<HakaAttribute> attr = Ebean.find(HakaAttribute.class)
//                    .where()
//                    .eq("user.id", u.getId())
//                    .like("key", "schacPersonalUniqueCode")
//                    .findList();
//
//            for (HakaAttribute a : attr) {
//                part.put(a.getKey(), a.getValue());
//            }

            part.put("name", String.format("%s %s", u.getFirstName(), u.getLastName()));
            array.add(part);
        }

        return ok(Json.toJson(array));
/*
        if (students == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, firstName, lastName");

            return ok(jsonContext.toJsonString(students, true, options)).as("application/json");
        }*/
    }

    @Restrict({@Group("ADMIN")})
    public static Result removeReservation(long id) throws MalformedDataException, NotFoundException {

        //todo: email trigger: remove reservation
        final ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .where()
                .eq("reservation.id", id)
                .findUnique();

        if (enrolment == null) {
            throw new NotFoundException(String.format("No reservation with id %d for current user.", id));
        }

        ExamParticipation participation = Ebean.find(ExamParticipation.class)
                .where()
                .eq("exam.id", enrolment.getExam().getId())
                .findUnique();

        if (participation != null) {
            return forbidden(String.format("sitnet_unable_to_remove_reservation (id=%d).", participation.getId()));
        }

        Reservation reservation = enrolment.getReservation();
        // Lets not send emails about historical reservations
        if (reservation.getEndAt().before(new Date())) {
            User student = enrolment.getUser();
            EmailComposer.composeReservationCancelationNotification(student, reservation, "");
        }

        // TODO: do we need to keep these for history purposes?
        enrolment.setReservation(null);
        Ebean.save(enrolment);
        Ebean.delete(Reservation.class, id);
        Ebean.delete(enrolment);

        return ok("removed");
    }

    @Restrict({@Group("ADMIN")})
    public static Result getReservations(Long studentId, Long roomId, Long examId) {


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
                .orderBy("reservation.startAt")
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
                .orderBy("reservation.startAt")
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
                .orderBy("reservation.startAt")
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
    public static Result getReservationsByExam(Long examId, String start, String end) {

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
                .orderBy("reservation.startAt")
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
