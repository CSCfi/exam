package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import exceptions.NotFoundException;
import models.*;
import org.joda.time.DateTime;
import play.libs.F;
import play.libs.Json;
import play.mvc.Result;
import util.java.EmailComposer;

import java.io.IOException;
import java.util.Date;
import java.util.Iterator;
import java.util.List;


public class AdminReservationController extends SitnetController {

    @Restrict({@Group("ADMIN")})
    public static Result getExams() {

        List<Exam> exams = Ebean.find(Exam.class)
                .where()
                .isNull("parent") // only Exam prototypes
                .eq("state", Exam.State.PUBLISHED.toString())
                .gt("examActiveEndDate", new Date())
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
            options.setRootPathProperties("id, name, examMachines");
            options.setPathProperties("examMachines", "id");

            return ok(jsonContext.toJsonString(examRooms, true, options)).as("application/json");
        }
    }

    @Restrict({@Group("ADMIN")})
    public static Result getStudents() {

        List<User> students = Ebean.find(User.class)
                .where()
                .eq("roles.name", "STUDENT")
                .findList();

        ArrayNode array = JsonNodeFactory.instance.arrayNode();
        for (User u : students) {
            ObjectNode part = Json.newObject();
            part.put("id", u.getId());
            part.put("firstName", u.getFirstName());
            part.put("lastName", u.getLastName());
            part.put("name", String.format("%s %s", u.getFirstName(), u.getLastName()));
            array.add(part);
        }

        return ok(Json.toJson(array));
    }

    @Restrict({@Group("ADMIN")})
    public static Result getTeachers() {

        List<User> students = Ebean.find(User.class)
                .where()
                .eq("roles.name", "TEACHER")
                .findList();

        ArrayNode array = JsonNodeFactory.instance.arrayNode();
        for (User u : students) {
            ObjectNode part = Json.newObject();
            part.put("id", u.getId());
            part.put("firstName", u.getFirstName());
            part.put("lastName", u.getLastName());
            part.put("name", String.format("%s %s", u.getFirstName(), u.getLastName()));
            array.add(part);
        }

        return ok(Json.toJson(array));
    }

    @Restrict({@Group("ADMIN")})
    public static Result removeReservation(long id) throws IOException, NotFoundException {

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
        if (reservation.getEndAt().after(new Date())) {
            User student = enrolment.getUser();
            EmailComposer.composeReservationCancellationNotification(student, reservation, "", false, enrolment);
        }

        enrolment.setReservation(null);
        Ebean.save(enrolment);
        Ebean.delete(Reservation.class, id);
        Ebean.delete(enrolment);
        return ok("removed");
    }

    @Restrict({@Group("ADMIN")})
    public static Result getReservations(F.Option<String> state, F.Option<Long> ownerId, F.Option<Long> studentId, F.Option<Long> roomId, F.Option<Long> machineId,
                                         F.Option<Long> examId, Long start, Long end) {

        ExpressionList<ExamEnrolment> query = Ebean.find(ExamEnrolment.class)
                .fetch("exam.examInspections")
                .where();
        DateTime startDate = new DateTime(start).withTimeAtStartOfDay();
        query = query.ge("reservation.startAt", startDate.toDate());
        DateTime endDate = new DateTime(end).plusDays(1).withTimeAtStartOfDay();
        query = query.lt("reservation.endAt", endDate.toDate());

        if (state.isDefined() && !state.get().equals("NO_SHOW")) {
            query = query.eq("exam.state", state.get());
        }

        if (studentId.isDefined()) {
            query = query.eq("user.id", studentId.get());
        }
        if (roomId.isDefined()) {
            query = query.eq("reservation.machine.room.id", roomId.get());
        }
        if (machineId.isDefined()) {
            query = query.eq("reservation.machine.id", machineId.get());
        }
        if (examId.isDefined()) {
            query = query.disjunction().eq("exam.parent.id", examId.get()).eq("exam.id", examId.get()).endJunction();
        }

        List<ExamEnrolment> enrolments = query.orderBy("reservation.startAt").findList();

        if (enrolments == null) {
            return notFound();
        }

        if (ownerId.isDefined()) {
            User user = Ebean.find(User.class, ownerId.get());
            Iterator<ExamEnrolment> it = enrolments.listIterator();
            while (it.hasNext()) {
                ExamEnrolment ee = it.next();
                Exam exam = ee.getExam().getParent() == null ? ee.getExam() : ee.getExam().getParent();
                if (!exam.getExamOwners().contains(user)) {
                    it.remove();
                }
            }
        }

        // Need to manually include/exclude the no-shows
        if (state.isDefined()) {
            Iterator<ExamEnrolment> it = enrolments.listIterator();
            while (it.hasNext()) {
                ExamEnrolment ee = it.next();
                boolean isNoShow = ee.getExam().getParent() == null &&
                        ee.getReservation().getEndAt().before(DateTime.now().toDate());
                if (isNoShow != state.get().equals("NO_SHOW")) {
                    it.remove();
                }
            }
        }

        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, enrolledOn, user, exam, reservation");
        options.setPathProperties("user", "id, firstName, lastName, email, userIdentifier");
        options.setPathProperties("exam", "id, name, state, examOwners, parent, examInspections");
        options.setPathProperties("exam.examOwners", "id, firstName, lastName");
        options.setPathProperties("exam.examInspections", "id, user");
        options.setPathProperties("exam.examInspections.user", "id, firstName, lastName");
        options.setPathProperties("parent", "id, examOwners");
        options.setPathProperties("parent.examOwners", "id, firstName, lastName");
        options.setPathProperties("reservation", "id, startAt, endAt, machine");
        options.setPathProperties("reservation.machine", "id, name, ipAddress, room, otherIdentifier");
        options.setPathProperties("reservation.machine.room", "id, name, roomCode");

        return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
    }
}
