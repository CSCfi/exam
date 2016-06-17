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
import play.data.DynamicForm;
import play.libs.Json;
import play.mvc.Result;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.io.IOException;
import java.util.*;


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

        DynamicForm df = formFactory.form().bindFromRequest();
        String msg = df.get("msg");

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
            emailComposer.composeReservationCancellationNotification(student, reservation, msg, false, enrolment);
        }

        enrolment.setReservation(null);
        Ebean.save(enrolment);
        Ebean.delete(Reservation.class, id);
        Ebean.delete(enrolment);
        return ok("removed");
    }

    @Restrict({@Group("ADMIN")})
    public Result findAvailableMachines(Long reservationId) {
        Reservation reservation = Ebean.find(Reservation.class, reservationId);
        if (reservation == null) {
            return notFound();
        }
        PathProperties props = PathProperties.parse("(id, name)");
        Query<ExamMachine> query = Ebean.createQuery(ExamMachine.class);
        props.apply(query);

        List<ExamMachine> candidates = query.where()
                .eq("room", reservation.getMachine().getRoom())
                .ne("outOfService", true)
                .ne("archived", true)
                .findList();

        Iterator<ExamMachine> it = candidates.listIterator();
        while (it.hasNext()) {
            ExamMachine machine = it.next();
            if (!machine.hasRequiredSoftware(reservation.getEnrolment().getExam())) {
                it.remove();
            }
            if (machine.isReservedDuring(reservation.toInterval())) {
                it.remove();
            }
        }
        return ok(candidates, props);
    }

    @Restrict({@Group("ADMIN")})
    public Result updateMachine(Long reservationId) {
        Reservation reservation = Ebean.find(Reservation.class, reservationId);
        if (reservation == null) {
            return notFound();
        }
        DynamicForm df = formFactory.form().bindFromRequest();
        Long machineId = Long.parseLong(df.get("machineId"));
        PathProperties props = PathProperties.parse("(id, name, room(id, name))");
        Query<ExamMachine> query = Ebean.createQuery(ExamMachine.class);
        props.apply(query);
        ExamMachine machine = query.where().idEq(machineId).findUnique();
        if (machine == null) {
            return notFound();
        }
        if (!machine.getRoom().equals(reservation.getMachine().getRoom())) {
            return forbidden("Not allowed to change to use a machine from a different room");
        }
        if (!machine.hasRequiredSoftware(reservation.getEnrolment().getExam()) ||
                machine.isReservedDuring(reservation.toInterval())) {
            return forbidden("Machine not eligible for choosing");
        }
        reservation.setMachine(machine);
        reservation.update();
        return ok(machine, props);
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result getReservations(Optional<String> state, Optional<Long> ownerId, Optional<Long> studentId,
                                  Optional<Long> roomId, Optional<Long> machineId, Optional<Long> examId,
                                  Optional<Long> start, Optional<Long> end) {
        ExpressionList<ExamEnrolment> query = Ebean.find(ExamEnrolment.class)
                .fetch("user", "id, firstName, lastName, email, userIdentifier")
                .fetch("exam", "id, name, state, trialCount")
                .fetch("exam.course", "code")
                .fetch("exam.examOwners", "id, firstName, lastName", new FetchConfig().query())
                .fetch("exam.parent.examOwners", "id, firstName, lastName", new FetchConfig().query())
                .fetch("exam.examInspections.user", "id, firstName, lastName")
                .fetch("reservation", "startAt, endAt, noShow, retrialPermitted")
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

        if (start.isPresent()) {
            DateTime startDate = new DateTime(start.get()).withTimeAtStartOfDay();
            query = query.ge("reservation.startAt", startDate.toDate());
        }

        if (end.isPresent()) {
            DateTime endDate = new DateTime(end.get()).plusDays(1).withTimeAtStartOfDay();
            query = query.lt("reservation.endAt", endDate.toDate());
        }

        if (state.isPresent()) {
            if (!state.get().equals("NO_SHOW")) {
                query = query.eq("exam.state", Exam.State.valueOf(state.get()));
                if (state.get().equals(Exam.State.PUBLISHED.toString())) {
                    query = query.eq("reservation.noShow", false);
                }
            } else {
                query = query.eq("reservation.noShow", true);
            }
        }

        if (studentId.isPresent()) {
            query = query.eq("user.id", studentId.get());
        }
        if (roomId.isPresent()) {
            query = query.eq("reservation.machine.room.id", roomId.get());
        }
        if (machineId.isPresent()) {
            query = query.eq("reservation.machine.id", machineId.get());
        }
        if (examId.isPresent()) {
            query = query.disjunction().eq("exam.parent.id", examId.get()).eq("exam.id", examId.get()).endJunction();
        }

        if (ownerId.isPresent() && user.hasRole("ADMIN", getSession())) {
            Long userId = ownerId.get();
            query = query.disjunction().eq("exam.examOwners.id", userId).eq("exam.parent.examOwners.id", userId).endJunction();
        }
        Set<ExamEnrolment> enrolments = query.orderBy("reservation.startAt").findSet();
        return ok(enrolments);
    }
}
