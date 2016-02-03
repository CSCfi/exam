package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.FetchConfig;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.PathProperties;
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

import javax.inject.Inject;
import java.io.IOException;
import java.util.Date;
import java.util.List;
import java.util.Set;


public class ReservationController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result getExams() {
        User user = getLoggedUser();
        PathProperties props = PathProperties.parse("(id, name)");
        Query<Exam> q = Ebean.createQuery(Exam.class);
        props.apply(q);
        ExpressionList<Exam> el = q.where()
                .isNull("parent") // only Exam prototypes
                .eq("state", Exam.State.PUBLISHED);
        if (user.hasRole("TEACHER", getSession())) {
            el = el.gt("examActiveEndDate", new Date())
                    .disjunction()
                    .eq("creator", user)
                    .eq("examOwners", user)
                    .eq("examInspections.user", user)
                    .eq("shared", true)
                    .endJunction();
        }
        return ok(el.findList(), props);
    }

    @Restrict({@Group("ADMIN")})
    public Result getExamRooms() {
        List<ExamRoom> examRooms = Ebean.find(ExamRoom.class)
                .select("id, name").fetch("examMachines", "id").findList();
        return ok(examRooms);
    }

    private ArrayNode asJson(List<User> users) {
        ArrayNode array = JsonNodeFactory.instance.arrayNode();
        for (User u : users) {
            String name = String.format("%s %s", u.getFirstName(), u.getLastName());
            if (u.getUserIdentifier() != null) {
                name += String.format(" (%s)", u.getUserIdentifier());
            }
            ObjectNode part = Json.newObject();
            part.put("id", u.getId());
            part.put("firstName", u.getFirstName());
            part.put("lastName", u.getLastName());
            part.put("userIdentifier", u.getUserIdentifier());
            part.put("name", name);
            array.add(part);
        }
        return array;
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result getStudents() {

        List<User> students = Ebean.find(User.class)
                .where()
                .eq("roles.name", "STUDENT")
                .findList();
        return ok(Json.toJson(asJson(students)));
    }

    @Restrict({@Group("ADMIN")})
    public Result getTeachers() {

        List<User> teachers = Ebean.find(User.class)
                .where()
                .eq("roles.name", "TEACHER")
                .findList();

        return ok(Json.toJson(asJson(teachers)));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result permitRetrial(Long id) {
        Reservation reservation = Ebean.find(Reservation.class, id);
        if (reservation == null) {
            return notFound("sitnet_not_found");
        }
        reservation.setRetrialPermitted(true);
        reservation.update();
        return ok();
    }

    @Restrict({@Group("ADMIN")})
    public Result removeReservation(long id) throws IOException, NotFoundException {

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
            emailComposer.composeReservationCancellationNotification(student, reservation, "", false, enrolment);
        }

        enrolment.setReservation(null);
        Ebean.save(enrolment);
        Ebean.delete(Reservation.class, id);
        Ebean.delete(enrolment);
        return ok("removed");
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result getReservations(F.Option<String> state, F.Option<Long> ownerId, F.Option<Long> studentId, F.Option<Long> roomId, F.Option<Long> machineId,
                                  F.Option<Long> examId, F.Option<Long> start, F.Option<Long> end) {
        ExpressionList<ExamEnrolment> query = Ebean.find(ExamEnrolment.class)
                .fetch("user", "id, firstName, lastName, email, userIdentifier")
                .fetch("exam", "id, name, state")
                .fetch("exam.course", "code")
                .fetch("exam.examOwners", "id, firstName, lastName", new FetchConfig().query())
                .fetch("exam.parent.examOwners", "id, firstName, lastName",  new FetchConfig().query())
                .fetch("exam.examInspections.user", "id, firstName, lastName")
                .fetch("reservation", "startAt, endAt, noShow")
                .fetch("reservation.machine", "id, name, ipAddress, otherIdentifier")
                .fetch("reservation.machine.room", "id, name, roomCode")
                .where()
                .ne("exam.state", Exam.State.DELETED);

        User user = getLoggedUser();
        if (user.hasRole("TEACHER", getSession())) {
            query = query.disjunction()
                    .eq("exam.parent.examOwners", user)
                    .eq("exam.examOwners", user)
                    .endJunction();
        }

        if (start.isDefined()) {
            DateTime startDate = new DateTime(start.get()).withTimeAtStartOfDay();
            query = query.ge("reservation.startAt", startDate.toDate());
        } else {
            query = query.ge("reservation.startAt", new DateTime().withTimeAtStartOfDay());
        }

        if (end.isDefined()) {
            DateTime endDate = new DateTime(end.get()).plusDays(1).withTimeAtStartOfDay();
            query = query.lt("reservation.endAt", endDate.toDate());
        }

        if (state.isDefined()) {
            if (!state.get().equals("NO_SHOW")) {
                query = query.eq("exam.state", Exam.State.valueOf(state.get()));
                if (state.get().equals(Exam.State.PUBLISHED.toString())) {
                    query = query.eq("reservation.noShow", false);
                }
            } else {
                query = query.eq("reservation.noShow", true);
            }
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

        if (ownerId.isDefined() && user.hasRole("ADMIN", getSession())) {
            Long userId = ownerId.get();
            query = query.disjunction().eq("exam.examOwners.id", userId).eq("exam.parent.examOwners.id", userId).endJunction();
        }
        Set<ExamEnrolment> enrolments = query.orderBy("reservation.startAt").findSet();
        return ok(enrolments);
    }
}
