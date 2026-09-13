// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.enrolment;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import controllers.base.BaseController;
import controllers.iop.collaboration.api.CollaborativeExamLoader;
import controllers.iop.transfer.api.ExternalReservationHandler;
import impl.CalendarHandler;
import impl.mail.EmailComposer;
import io.ebean.DB;
import io.ebean.FetchConfig;
import io.ebean.text.PathProperties;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;
import javax.inject.Inject;
import miscellaneous.datetime.DateTimeHandler;
import miscellaneous.user.UserHandler;
import models.base.GeneratedIdentityModel;
import models.enrolment.ExamEnrolment;
import models.enrolment.ExamParticipation;
import models.enrolment.Reservation;
import models.exam.Exam;
import models.facility.ExamMachine;
import models.facility.ExamRoom;
import models.user.Role;
import models.user.User;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.ISODateTimeFormat;
import org.springframework.beans.BeanUtils;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;
import sanitizers.Attrs;
import scala.jdk.javaapi.OptionConverters;
import security.Authenticated;
import system.interceptors.Anonymous;

public class ReservationController extends BaseController {

    private final EmailComposer emailComposer;
    private final CollaborativeExamLoader collaborativeExamLoader;
    private final ExternalReservationHandler externalReservationHandler;
    private final DateTimeHandler dateTimeHandler;
    private final UserHandler userHandler;
    private final CalendarHandler calendarHandler;

    @Inject
    public ReservationController(
        EmailComposer emailComposer,
        CollaborativeExamLoader collaborativeExamLoader,
        ExternalReservationHandler externalReservationHandler,
        DateTimeHandler dateTimeHandler,
        UserHandler userHandler,
        CalendarHandler calendarHandler
    ) {
        this.emailComposer = emailComposer;
        this.collaborativeExamLoader = collaborativeExamLoader;
        this.externalReservationHandler = externalReservationHandler;
        this.dateTimeHandler = dateTimeHandler;
        this.userHandler = userHandler;
        this.calendarHandler = calendarHandler;
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("SUPPORT") })
    public Result getExams(Http.Request request, Optional<String> filter) {
        var user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        var props = PathProperties.parse("(id, name)");
        var q = DB.createQuery(Exam.class);
        props.apply(q);
        var el = q
            .where()
            .isNull("parent") // only Exam prototypes
            .eq("state", Exam.State.PUBLISHED);
        if (filter.isPresent()) {
            el = el.ilike("name", String.format("%%%s%%", filter.get()));
        }
        if (user.hasRole(Role.Name.TEACHER)) {
            el = el
                .gt("periodEnd", new Date())
                .disjunction()
                .eq("creator", user)
                .eq("examOwners", user)
                .eq("examInspections.user", user)
                .eq("shared", true)
                .endJunction();
        }
        return ok(el.findList(), props);
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT") })
    public Result getExamRooms() {
        var examRooms = DB.find(ExamRoom.class).select("id, name").fetch("examMachines", "id").findList();
        return ok(examRooms);
    }

    private ArrayNode asJson(List<User> users) {
        var array = JsonNodeFactory.instance.arrayNode();
        for (var u : users) {
            var name = String.format("%s %s", u.getFirstName(), u.getLastName());
            if (u.getUserIdentifier() != null) {
                name += String.format(" (%s)", u.getUserIdentifier());
            }
            var part = Json.newObject();
            part.put("id", u.getId());
            part.put("firstName", u.getFirstName());
            part.put("lastName", u.getLastName());
            part.put("userIdentifier", u.getUserIdentifier());
            part.put("name", name);
            array.add(part);
        }
        return array;
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("SUPPORT") })
    public Result getStudents(Optional<String> filter) {
        var el = DB.find(User.class).where().eq("roles.name", "STUDENT");
        if (filter.isPresent()) {
            el = el.or().ilike("userIdentifier", String.format("%%%s%%", filter.get()));
            el = userHandler.applyNameSearch(null, el, filter.get()).endOr();
        }
        return ok(Json.toJson(asJson(el.findList())));
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT") })
    public Result getTeachers(Optional<String> filter) {
        var el = DB.find(User.class).where().eq("roles.name", "TEACHER");
        if (filter.isPresent()) {
            el = userHandler.applyNameSearch(null, el.or(), filter.get()).endOr();
        }
        return ok(Json.toJson(asJson(el.findList())));
    }

    @Restrict({ @Group("ADMIN") })
    public CompletionStage<Result> removeReservation(long id, Http.Request request) {
        var enrolment = DB.find(ExamEnrolment.class).where().eq("reservation.id", id).findOne();
        if (enrolment == null) {
            throw new IllegalArgumentException(String.format("No reservation with id %d for current user.", id));
        }
        var participation = DB.find(ExamParticipation.class).where().eq("exam", enrolment.getExam()).findOne();
        if (participation != null) {
            return wrapAsPromise(
                forbidden(String.format("i18n_unable_to_remove_reservation (id=%d).", participation.getId()))
            );
        }
        var reservation = enrolment.getReservation();
        var msg = formFactory.form().bindFromRequest(request).get("msg");
        // Let's not send emails about historical reservations
        if (reservation.getEndAt().isAfter(DateTime.now())) {
            var student = enrolment.getUser();
            emailComposer.composeReservationCancellationNotification(
                student,
                reservation,
                OptionConverters.toScala(Optional.of(msg)),
                false,
                enrolment
            );
        }
        if (reservation.getExternalReservation() != null) {
            return externalReservationHandler.removeReservation(reservation, enrolment.getUser(), msg);
        } else {
            enrolment.setReservation(null);
            enrolment.update();
            reservation.delete();
            return wrapAsPromise(ok());
        }
    }

    private boolean hasStarted(Reservation reservation) {
        return !reservation.getStartAt().isAfter(dateTimeHandler.adjustDST(DateTime.now(), reservation));
    }

    private List<Interval> findSuitableSlots(ExamMachine machine, Reservation reservation, Exam exam) {
        var interval = reservation.toInterval();
        var slots = new ArrayList<Interval>();
        // An ongoing reservation can keep its original time: the student is already taking the
        // exam, so the machine change need not shift the time they have left.
        if (hasStarted(reservation)) {
            slots.add(interval);
        }
        var room = machine.getRoom();
        var dtz = DateTimeZone.forID(room.getLocalTimezone());
        var searchDate = dateTimeHandler.normalize(reservation.getStartAt().withZone(dtz), dtz).toLocalDate();
        // Find the first slot that starts at or after the interval's start
        // and ends at or after the interval's end
        // This handles cases where rooms have different slot start times (e.g., 10:00 vs. 10:10)
        // The calendar no longer offers slots that have begun, so for an ongoing reservation this
        // is the next free slot rather than the original one.
        calendarHandler
            .gatherSuitableSlots(room, searchDate, exam.getDuration())
            .stream()
            .filter(s -> !s.getStart().isBefore(interval.getStart()))
            .filter(s -> !s.getEnd().isBefore(interval.getEnd()))
            .filter(s -> !slots.contains(s))
            .findFirst()
            .ifPresent(slots::add);
        return slots;
    }

    private List<Interval> availableSlots(ExamMachine machine, Reservation reservation) {
        var exam = getReservationExam(reservation);
        if (exam.isEmpty() || !machine.hasRequiredSoftware(exam.get())) {
            return List.of();
        }
        // Slots fit within opening hours (default and exception) by construction
        // Note: Maintenance periods are system-wide, so they were already validated when the reservation was created
        return findSuitableSlots(machine, reservation, exam.get())
            .stream()
            // Check if machine is available for the whole slot
            // Exclude the current reservation if it's already assigned to this machine
            .filter(slot ->
                machine
                    .getReservations()
                    .stream()
                    .noneMatch(r -> !r.equals(reservation) && slot.overlaps(r.toInterval()))
            )
            .toList();
    }

    // The client picks one of the slots offered by findAvailableMachines. A client that sends no
    // slot gets the first one offered, that is, the ongoing time whenever there is one.
    private Optional<Interval> resolveSlot(JsonNode body, List<Interval> offered) {
        if (!body.hasNonNull("start") || !body.hasNonNull("end")) {
            return Optional.of(offered.get(0));
        }
        var parser = ISODateTimeFormat.dateTimeParser();
        var start = parser.parseDateTime(body.get("start").asText());
        var end = parser.parseDateTime(body.get("end").asText());
        return offered
            .stream()
            .filter(s -> s.getStart().isEqual(start) && s.getEnd().isEqual(end))
            .findFirst();
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT") })
    public Result findAvailableMachines(Long reservationId, Long roomId)
        throws ExecutionException, InterruptedException {
        var reservation = DB.find(Reservation.class, reservationId);
        var room = DB.find(ExamRoom.class, roomId);
        if (reservation == null || room == null) {
            return notFound();
        }
        if (getReservationExam(reservation).isEmpty()) {
            return notFound();
        }
        var timezone = DateTimeZone.forID(room.getLocalTimezone());
        var formatter = DateTimeFormat.forPattern("HH:mm").withZone(timezone);
        var props = PathProperties.parse("(id, name)");
        var query = DB.createQuery(ExamMachine.class);
        props.apply(query);
        var candidates = query
            .where()
            .eq("room.id", roomId)
            .ne("outOfService", true)
            .ne("archived", true)
            .ne("id", reservation.getMachine().getId())
            .findList();

        var arrayNode = Json.newArray();
        candidates.forEach(machine -> {
            var slots = availableSlots(machine, reservation);
            if (slots.isEmpty()) {
                return;
            }
            var json = Json.newObject();
            json.set("machine", Json.toJson(machine));
            var slotNodes = json.putArray("slots");
            slots.forEach(slot -> {
                var slotNode = slotNodes.addObject();
                // start and end identify the slot when it is picked, startAt and endAt are for display
                slotNode.put("start", ISODateTimeFormat.dateTime().print(slot.getStart()));
                slotNode.put("end", ISODateTimeFormat.dateTime().print(slot.getEnd()));
                slotNode.put("startAt", formatter.print(slot.getStart()));
                slotNode.put("endAt", formatter.print(slot.getEnd()));
            });
            arrayNode.add(json);
        });
        return Results.ok(arrayNode).as("application/json");
    }

    @Restrict({ @Group("ADMIN"), @Group("SUPPORT") })
    public Result updateMachine(Long reservationId, Http.Request request) {
        var reservation = DB.find(Reservation.class, reservationId);

        if (reservation == null) {
            return notFound();
        }
        var body = request.body().asJson();
        var machineId = body.get("machineId").asLong();
        var machineProps = PathProperties.parse("(id, name, room(*))");
        var previous = new Reservation();
        BeanUtils.copyProperties(reservation, previous);
        var query = DB.createQuery(ExamMachine.class);
        machineProps.apply(query);
        var machine = query.where().idEq(machineId).findOne();
        if (machine == null) {
            return notFound();
        }
        var offeredSlots = availableSlots(machine, reservation);
        if (offeredSlots.isEmpty()) {
            return forbidden("Machine not eligible for choosing");
        }
        var slot = resolveSlot(body, offeredSlots);
        if (slot.isEmpty()) {
            return forbidden("Chosen time slot is not available");
        }
        // Adjust reservation times to the slot that was picked
        reservation.setStartAt(slot.get().getStart());
        reservation.setEndAt(slot.get().getEnd());
        reservation.setMachine(machine);
        reservation.update();
        emailComposer.composeReservationChangeNotification(reservation, previous);
        return ok(reservation, PathProperties.parse("(startAt, endAt, machine(*))"));
    }

    private Optional<Exam> getReservationExam(Reservation reservation) {
        if (reservation.getEnrolment().getExam() != null) {
            return Optional.of(reservation.getEnrolment().getExam());
        }
        try {
            return collaborativeExamLoader
                .downloadExam(reservation.getEnrolment().getCollaborativeExam())
                .toCompletableFuture()
                .get();
        } catch (InterruptedException | ExecutionException e) {
            return Optional.empty();
        }
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("SUPPORT"), @Group("TEACHER") })
    @Anonymous(filteredProperties = { "user" })
    public Result listExaminationEvents(
        Optional<String> state,
        Optional<Long> ownerId,
        Optional<Long> studentId,
        Optional<Long> examId,
        Optional<String> start,
        Optional<String> end,
        Http.Request request
    ) {
        var query = DB.find(ExamEnrolment.class)
            .fetch("user", "id, firstName, lastName, email, userIdentifier")
            .fetch("exam", "id, name, state, trialCount, implementation")
            .fetch("exam.course", "code")
            .fetch("exam.examOwners", "id, firstName, lastName", FetchConfig.ofQuery())
            .fetch("exam.parent.examOwners", "id, firstName, lastName", FetchConfig.ofQuery())
            .fetch("exam.examInspections.user", "id, firstName, lastName")
            .fetch("exam.executionType", "type")
            .fetch("examinationEventConfiguration.examinationEvent")
            .where()
            .isNotNull("examinationEventConfiguration")
            .isNotNull("exam");
        var user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (user.hasRole(Role.Name.TEACHER)) {
            query = query
                .disjunction()
                .eq("exam.parent.examOwners", user)
                .eq("exam.examOwners", user)
                .endJunction()
                .ne("exam.state", Exam.State.DELETED);
        }

        if (start.isPresent()) {
            var startDate = DateTime.parse(start.get(), ISODateTimeFormat.dateTimeParser());
            query = query.ge("examinationEventConfiguration.examinationEvent.start", startDate.toDate());
        }

        if (state.isPresent()) {
            query = switch (state.get()) {
                case "NO_SHOW" -> query.eq("noShow", true);
                case "EXTERNAL_UNFINISHED", "EXTERNAL_FINISHED" -> query.isNull("id"); // Deliberately force an empty result set
                default -> query.eq("exam.state", Exam.State.valueOf(state.get())).eq("noShow", false);
            };
        }

        if (studentId.isPresent()) {
            query = query.eq("user.id", studentId.get());
            // Hide reservations for anonymous exams.
            if (user.hasRole(Role.Name.TEACHER)) {
                query.eq("exam.anonymous", false);
            }
        }
        if (examId.isPresent()) {
            query = query
                .ne("exam.state", Exam.State.DELETED) // Local student reservation
                .disjunction()
                .eq("exam.parent.id", examId.get())
                .eq("exam.id", examId.get())
                .endJunction();
        }

        if (ownerId.isPresent() && user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)) {
            var userId = ownerId.get();
            query = query
                .disjunction()
                .eq("exam.examOwners.id", userId)
                .eq("exam.parent.examOwners.id", userId)
                .endJunction();
        }
        var enrolments = query
            .orderBy("examinationEventConfiguration.examinationEvent.start")
            .findList()
            .stream()
            .filter(ee -> {
                if (end.isEmpty()) {
                    return true;
                }
                var endDate = DateTime.parse(end.get(), ISODateTimeFormat.dateTimeParser());
                var eventEnd = ee
                    .getExaminationEventConfiguration()
                    .getExaminationEvent()
                    .getStart()
                    .plusMinutes(ee.getExam().getDuration());
                return eventEnd.isBefore(endDate);
            })
            .toList();

        var result = ok(enrolments);
        var anonIds = enrolments
            .stream()
            .filter(ee -> ee.getExam().isAnonymous())
            .map(GeneratedIdentityModel::getId)
            .collect(Collectors.toSet());
        return writeAnonymousResult(request, result, anonIds);
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("SUPPORT"), @Group("TEACHER") })
    @Anonymous(filteredProperties = { "user", "externalUserRef" })
    public Result listReservations(
        Optional<String> state,
        Optional<Long> ownerId,
        Optional<Long> studentId,
        Optional<Long> roomId,
        Optional<Long> machineId,
        Optional<Long> examId,
        Optional<String> start,
        Optional<String> end,
        Optional<String> externalRef,
        Http.Request request
    ) {
        var query = DB.find(Reservation.class)
            .fetch("enrolment", "noShow, retrialPermitted")
            .fetch("user", "id, firstName, lastName, email, userIdentifier")
            .fetch("enrolment.exam", "id, name, state, trialCount, implementation")
            .fetch("enrolment.externalExam", "id, externalRef, finished")
            .fetch("enrolment.exam.course", "code")
            .fetch("enrolment.exam.examOwners", "id, firstName, lastName", FetchConfig.ofQuery())
            .fetch("enrolment.exam.parent.examOwners", "id, firstName, lastName", FetchConfig.ofQuery())
            .fetch("enrolment.exam.examInspections.user", "id, firstName, lastName")
            .fetch("enrolment.exam.executionType", "type")
            .fetch("enrolment.collaborativeExam", "*")
            .fetch("externalReservation")
            .fetch("machine", "id, name, ipAddress, otherIdentifier")
            .fetch("machine.room", "id, name, roomCode")
            .where();

        var user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (user.hasRole(Role.Name.TEACHER)) {
            query = query
                .isNull("enrolment.externalExam") // Hide reservations of external students (just to be sure)
                .isNull("enrolment.collaborativeExam") // Hide collaborative exams from teachers.
                .ne("enrolment.exam.state", Exam.State.DELETED) // Hide deleted exams from teachers
                .or()
                .eq("enrolment.exam.parent.examOwners", user)
                .eq("enrolment.exam.examOwners", user)
                .endOr();
        }

        if (start.isPresent()) {
            var startDate = DateTime.parse(start.get(), ISODateTimeFormat.dateTimeParser());
            var offset = dateTimeHandler.getTimezoneOffset(startDate.withDayOfYear(1));
            query = query.ge("startAt", startDate.plusMillis(offset));
        }

        if (end.isPresent()) {
            var endDate = DateTime.parse(end.get(), ISODateTimeFormat.dateTimeParser());
            var offset = dateTimeHandler.getTimezoneOffset(endDate.withDayOfYear(1));
            query = query.lt("endAt", endDate.plusMillis(offset));
        }

        if (state.isPresent()) {
            query = switch (state.get()) {
                case "NO_SHOW" -> query.eq("enrolment.noShow", true);
                case "EXTERNAL_UNFINISHED" -> query
                    .isNotNull("externalUserRef")
                    .isNull("enrolment.externalExam.finished");
                case "EXTERNAL_FINISHED" -> query
                    .isNotNull("externalUserRef")
                    .isNotNull("enrolment.externalExam.finished");
                default -> query
                    .eq("enrolment.exam.state", Exam.State.valueOf(state.get()))
                    .eq("enrolment.noShow", false);
            };
        }

        if (studentId.isPresent()) {
            query = query.eq("user.id", studentId.get());
            // Hide reservations for anonymous exams.
            if (user.hasRole(Role.Name.TEACHER)) {
                query
                    .or()
                    .eq("enrolment.exam.anonymous", false)
                    .eq("enrolment.collaborativeExam.anonymous", false)
                    .endOr();
            }
        }
        if (roomId.isPresent()) {
            query = query.eq("machine.room.id", roomId.get());
        }
        if (machineId.isPresent()) {
            query = query.eq("machine.id", machineId.get());
        }
        if (examId.isPresent()) {
            query = query
                .disjunction()
                .eq("enrolment.exam.parent.id", examId.get())
                .eq("enrolment.exam.id", examId.get())
                .endJunction();
        } else if (externalRef.isPresent()) {
            query = query.eq("enrolment.collaborativeExam.externalRef", externalRef.get());
        }

        if (ownerId.isPresent() && (user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT))) {
            var userId = ownerId.get();
            query = query
                .disjunction()
                .eq("enrolment.exam.examOwners.id", userId)
                .eq("enrolment.exam.parent.examOwners.id", userId)
                .endJunction();
        }
        var reservations = query.orderBy("startAt").findSet();
        var result = ok(reservations);
        var anonIds = reservations
            .stream()
            .filter(
                r ->
                    r.getEnrolment() != null &&
                    r.getEnrolment().getExam() != null &&
                    r.getEnrolment().getExam().isAnonymous()
            )
            .map(GeneratedIdentityModel::getId)
            .collect(Collectors.toSet());
        return writeAnonymousResult(request, result, anonIds);
    }
}
