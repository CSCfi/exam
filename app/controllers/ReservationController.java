/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import controllers.base.BaseController;
import controllers.iop.collaboration.api.CollaborativeExamLoader;
import controllers.iop.transfer.api.ExternalReservationHandler;
import exceptions.NotFoundException;
import impl.EmailComposer;
import io.ebean.DB;
import io.ebean.FetchConfig;
import io.ebean.text.PathProperties;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;
import javax.inject.Inject;
import models.Exam;
import models.ExamEnrolment;
import models.ExamMachine;
import models.ExamParticipation;
import models.ExamRoom;
import models.Reservation;
import models.Role;
import models.User;
import models.base.GeneratedIdentityModel;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import sanitizers.Attrs;
import security.Authenticated;
import system.interceptors.Anonymous;
import util.datetime.DateTimeHandler;

public class ReservationController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected CollaborativeExamLoader collaborativeExamLoader;

    @Inject
    protected ExternalReservationHandler externalReservationHandler;

    @Inject
    protected DateTimeHandler dateTimeHandler;

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
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

    @Restrict({ @Group("ADMIN") })
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

    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public Result getStudents(Optional<String> filter) {
        var el = DB.find(User.class).where().eq("roles.name", "STUDENT");
        if (filter.isPresent()) {
            el = el.or().ilike("userIdentifier", String.format("%%%s%%", filter.get()));
            el = applyUserFilter(null, el, filter.get()).endOr();
        }
        return ok(Json.toJson(asJson(el.findList())));
    }

    @Restrict({ @Group("ADMIN") })
    public Result getTeachers(Optional<String> filter) {
        var el = DB.find(User.class).where().eq("roles.name", "TEACHER");
        if (filter.isPresent()) {
            el = applyUserFilter(null, el.or(), filter.get()).endOr();
        }
        return ok(Json.toJson(asJson(el.findList())));
    }

    @Restrict({ @Group("ADMIN") })
    public CompletionStage<Result> removeReservation(long id, Http.Request request) throws NotFoundException {
        var msg = request.body().asJson().get("msg").asText("");
        var enrolment = DB.find(ExamEnrolment.class).where().eq("reservation.id", id).findOne();

        if (enrolment == null) {
            throw new NotFoundException(String.format("No reservation with id %d for current user.", id));
        }

        var participation = DB.find(ExamParticipation.class).where().eq("exam", enrolment.getExam()).findOne();

        if (participation != null) {
            return wrapAsPromise(
                forbidden(String.format("i18n_unable_to_remove_reservation (id=%d).", participation.getId()))
            );
        }

        var reservation = enrolment.getReservation();
        // Let's not send emails about historical reservations
        if (reservation.getEndAt().isAfter(DateTime.now())) {
            var student = enrolment.getUser();
            emailComposer.composeReservationCancellationNotification(student, reservation, msg, false, enrolment);
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

    @Restrict({ @Group("ADMIN") })
    public Result findAvailableMachines(Long reservationId) throws ExecutionException, InterruptedException {
        var reservation = DB.find(Reservation.class, reservationId);
        if (reservation == null) {
            return notFound();
        }
        var props = PathProperties.parse("(id, name)");
        var query = DB.createQuery(ExamMachine.class);
        props.apply(query);

        var candidates = query
            .where()
            .eq("room", reservation.getMachine().getRoom())
            .ne("outOfService", true)
            .ne("archived", true)
            .findList();

        var exam = getReservationExam(reservation);
        var it = candidates.listIterator();
        while (it.hasNext()) {
            var machine = it.next();
            if (exam.isPresent() && !machine.hasRequiredSoftware(exam.get())) {
                it.remove();
            }
            if (machine.isReservedDuring(reservation.toInterval())) {
                it.remove();
            }
        }
        return ok(candidates, props);
    }

    @Restrict({ @Group("ADMIN") })
    public Result updateMachine(Long reservationId, Http.Request request)
        throws ExecutionException, InterruptedException {
        var reservation = DB.find(Reservation.class, reservationId);

        if (reservation == null) {
            return notFound();
        }
        var machineId = request.body().asJson().get("machineId").asLong();
        var props = PathProperties.parse("(id, name, room(id, name))");
        var query = DB.createQuery(ExamMachine.class);
        props.apply(query);
        var previous = reservation.getMachine();
        var machine = query.where().idEq(machineId).findOne();
        if (machine == null) {
            return notFound();
        }
        if (!machine.getRoom().equals(reservation.getMachine().getRoom())) {
            return forbidden("Not allowed to change to use a machine from a different room");
        }
        var exam = getReservationExam(reservation);
        if (
            exam.isEmpty() ||
            !machine.hasRequiredSoftware(exam.get()) ||
            machine.isReservedDuring(reservation.toInterval())
        ) {
            return forbidden("Machine not eligible for choosing");
        }
        reservation.setMachine(machine);
        reservation.update();
        emailComposer.composeReservationChangeNotification(
            reservation.getUser(),
            previous,
            machine,
            reservation.getEnrolment()
        );
        return ok(machine, props);
    }

    private Optional<Exam> getReservationExam(Reservation reservation) throws InterruptedException, ExecutionException {
        return reservation.getEnrolment().getExam() != null
            ? Optional.of(reservation.getEnrolment().getExam())
            : collaborativeExamLoader
                .downloadExam(reservation.getEnrolment().getCollaborativeExam())
                .toCompletableFuture()
                .get();
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    @Anonymous(filteredProperties = { "user" })
    public Result getExaminationEvents(
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

        if (ownerId.isPresent() && user.hasRole(Role.Name.ADMIN)) {
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
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    @Anonymous(filteredProperties = { "user", "externalUserRef" })
    public Result getReservations(
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
                .disjunction()
                .eq("enrolment.exam.parent.examOwners", user)
                .eq("enrolment.exam.examOwners", user)
                .endJunction();
        }

        if (start.isPresent()) {
            var startDate = DateTime.parse(start.get(), ISODateTimeFormat.dateTimeParser());
            query = query.ge("startAt", startDate.toDate());
        }

        if (end.isPresent()) {
            var endDate = DateTime.parse(end.get(), ISODateTimeFormat.dateTimeParser());
            var offset = dateTimeHandler.getTimezoneOffset(endDate);
            query = query.lt("endAt", endDate.plusMillis(offset).toDate());
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

        if (ownerId.isPresent() && user.hasRole(Role.Name.ADMIN)) {
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
