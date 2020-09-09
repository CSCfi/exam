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

package backend.controllers.iop.transfer.impl;

import backend.controllers.CalendarController;
import backend.exceptions.NotFoundException;
import backend.impl.CalendarHandler;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamMachine;
import backend.models.ExamRoom;
import backend.models.Reservation;
import backend.models.User;
import backend.sanitizers.Attrs;
import backend.sanitizers.ExternalCalendarReservationSanitizer;
import backend.security.Authenticated;
import backend.util.config.ConfigReader;
import backend.util.datetime.DateTimeUtils;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.text.PathProperties;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Collector;
import javax.inject.Inject;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;

public class ExternalCalendarController extends CalendarController {
    @Inject
    private WSClient wsClient;

    @Inject
    private CalendarHandler calendarHandler;

    @Inject
    private ConfigReader configReader;

    private static URL parseUrl(String orgRef, String facilityRef, String date, String start, String end, int duration)
        throws MalformedURLException {
        String url =
            ConfigFactory.load().getString("sitnet.integration.iop.host") +
            String.format("/api/organisations/%s/facilities/%s/slots", orgRef, facilityRef) +
            String.format("?date=%s&startAt=%s&endAt=%s&duration=%d", date, start, end, duration);
        return new URL(url);
    }

    private static URL parseUrl(String orgRef, String facilityRef) throws MalformedURLException {
        return new URL(
            ConfigFactory.load().getString("sitnet.integration.iop.host") +
            String.format("/api/organisations/%s/facilities/%s/reservations", orgRef, facilityRef)
        );
    }

    private static URL parseUrl(String orgRef, String facilityRef, String reservationRef) throws MalformedURLException {
        return new URL(
            ConfigFactory.load().getString("sitnet.integration.iop.host") +
            String.format(
                "/api/organisations/%s/facilities/%s/reservations/%s/force",
                orgRef,
                facilityRef,
                reservationRef
            )
        );
    }

    // Actions invoked by central IOP server

    @SubjectNotPresent
    public Result provideReservation(Http.Request request) {
        // Parse request body
        JsonNode node = request.body().asJson();
        String reservationRef = node.get("id").asText();
        String roomRef = node.get("roomId").asText();
        DateTime start = ISODateTimeFormat.dateTimeParser().parseDateTime(node.get("start").asText());
        DateTime end = ISODateTimeFormat.dateTimeParser().parseDateTime(node.get("end").asText());
        String userEppn = node.get("user").asText();
        if (start.isBeforeNow() || end.isBefore(start)) {
            return badRequest("invalid dates");
        }
        ExamRoom room = Ebean.find(ExamRoom.class).where().eq("externalRef", roomRef).findOne();
        if (room == null) {
            return notFound("room not found");
        }
        Optional<ExamMachine> machine = calendarHandler.getRandomMachine(
            room,
            null,
            start,
            end,
            Collections.emptyList()
        );
        if (machine.isEmpty()) {
            return forbidden("sitnet_no_machines_available");
        }
        // We are good to go :)
        Reservation reservation = new Reservation();
        reservation.setExternalRef(reservationRef);
        reservation.setEndAt(end);
        reservation.setStartAt(start);
        reservation.setMachine(machine.get());
        reservation.setExternalUserRef(userEppn);
        reservation.save();
        PathProperties pp = PathProperties.parse("(*, machine(*, room(*, mailAddress(*))))");

        return created(reservation, pp);
    }

    // Initiated by originator of reservation (the student)
    @SubjectNotPresent
    public Result acknowledgeReservationRemoval(String ref) {
        Reservation reservation = Ebean
            .find(Reservation.class)
            .fetch("machine")
            .fetch("machine.room")
            .where()
            .eq("externalRef", ref)
            .findOne();
        if (reservation == null) {
            return notFound("reservation not found");
        }
        // TODO: might need additional checks
        DateTime now = DateTimeUtils.adjustDST(DateTime.now(), reservation);
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return forbidden("sitnet_reservation_in_effect");
        }
        if (reservation.getEnrolment() != null) {
            reservation.getEnrolment().delete(); // cascades to reservation
        } else {
            reservation.delete();
        }
        return ok();
    }

    // Initiated by administrator of organisation where reservation takes place
    @SubjectNotPresent
    public Result acknowledgeReservationRevocation(String ref) {
        ExamEnrolment enrolment = Ebean
            .find(ExamEnrolment.class)
            .fetch("reservation")
            .fetch("reservation.externalReservation")
            .fetch("reservation.machine")
            .fetch("reservation.machine.room")
            .where()
            .eq("reservation.externalRef", ref)
            .findOne();
        if (enrolment == null) {
            return notFound(String.format("No reservation with ref %s.", ref));
        }

        Reservation reservation = enrolment.getReservation();
        DateTime now = DateTimeUtils.adjustDST(DateTime.now(), reservation);
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return forbidden("sitnet_reservation_in_effect");
        }
        enrolment.setReservation(null);
        enrolment.update();
        reservation.delete();
        return ok();
    }

    @SubjectNotPresent
    public Result provideSlots(
        Optional<String> roomId,
        Optional<String> date,
        Optional<String> start,
        Optional<String> end,
        Optional<Integer> duration
    ) {
        if (roomId.isPresent() && date.isPresent() && start.isPresent() && end.isPresent() && duration.isPresent()) {
            ExamRoom room = Ebean.find(ExamRoom.class).where().eq("externalRef", roomId.get()).findOne();
            if (room == null) {
                return forbidden(String.format("No room with ref: (%s)", roomId.get()));
            }
            Collection<CalendarHandler.TimeSlot> slots = new ArrayList<>();
            if (!room.getOutOfService() && !room.getState().equals(ExamRoom.State.INACTIVE.toString())) {
                LocalDate searchDate;
                try {
                    searchDate = parseSearchDate(date.get(), start.get(), end.get(), room);
                } catch (NotFoundException e) {
                    return notFound();
                }
                List<ExamMachine> machines = Ebean
                    .find(ExamMachine.class)
                    .where()
                    .eq("room.id", room.getId())
                    .ne("outOfService", true)
                    .ne("archived", true)
                    .findList();
                LocalDate endOfSearch = getEndSearchDate(end.get(), searchDate);
                while (!searchDate.isAfter(endOfSearch)) {
                    Set<CalendarHandler.TimeSlot> timeSlots = getExamSlots(room, duration.get(), searchDate, machines);
                    if (!timeSlots.isEmpty()) {
                        slots.addAll(timeSlots);
                    }
                    searchDate = searchDate.plusDays(1);
                }
            }
            return ok(Json.toJson(slots));
        } else {
            return badRequest();
        }
    }

    // Actions invoked directly by logged in users
    @Authenticated
    @With(ExternalCalendarReservationSanitizer.class)
    @Restrict(@Group("STUDENT"))
    public CompletionStage<Result> requestReservation(Http.Request request) throws MalformedURLException {
        if (!configReader.isVisitingExaminationSupported()) {
            return wrapAsPromise(forbidden("Feature not enabled in the installation"));
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        // Parse request body
        String orgRef = request.attrs().get(Attrs.ORG_REF);
        String roomRef = request.attrs().get(Attrs.ROOM_REF);
        DateTime start = request.attrs().get(Attrs.START_DATE);
        DateTime end = request.attrs().get(Attrs.END_DATE);
        Long examId = request.attrs().get(Attrs.EXAM_ID);
        Collection<Long> sectionIds = request.attrs().get(Attrs.SECTION_IDS);

        //TODO: See if this offset thing works as intended
        DateTime now = DateTimeUtils.adjustDST(DateTime.now());
        Optional<ExamEnrolment> oe = Ebean
            .find(ExamEnrolment.class)
            .fetch("reservation")
            .fetch("exam.examSections")
            .fetch("exam.examSections.examMaterials")
            .where()
            .eq("user.id", user.getId())
            .eq("exam.id", examId)
            .eq("exam.state", Exam.State.PUBLISHED)
            .or()
            .isNull("reservation")
            .gt("reservation.startAt", now.toDate())
            .endOr()
            .findOneOrEmpty();
        if (oe.isEmpty()) {
            return wrapAsPromise(forbidden("sitnet_error_enrolment_not_found"));
        }
        ExamEnrolment enrolment = oe.get();
        Optional<Result> error = checkEnrolment(enrolment, user, sectionIds);
        if (error.isPresent()) {
            return wrapAsPromise(error.get());
        }
        // Lets do this
        URL url = parseUrl(orgRef, roomRef);
        String homeOrgRef = ConfigFactory.load().getString("sitnet.integration.iop.organisationRef");
        ObjectNode body = Json.newObject();
        body.put("requestingOrg", homeOrgRef);
        body.put("start", ISODateTimeFormat.dateTime().print(start));
        body.put("end", ISODateTimeFormat.dateTime().print(end));
        body.put("user", user.getEppn());
        body.set(
            "optionalSections",
            sectionIds.stream().collect(Collector.of(Json::newArray, ArrayNode::add, ArrayNode::add))
        );

        WSRequest wsRequest = wsClient.url(url.toString());
        return wsRequest
            .post(body)
            .thenComposeAsync(
                response -> {
                    JsonNode root = response.asJson();
                    if (response.getStatus() != Http.Status.CREATED) {
                        return wrapAsPromise(internalServerError(root.get("message").asText("Connection refused")));
                    }
                    return calendarHandler
                        .handleExternalReservation(
                            enrolment,
                            enrolment.getExam(),
                            root,
                            start,
                            end,
                            user,
                            orgRef,
                            roomRef,
                            sectionIds
                        )
                        .thenApplyAsync(
                            err -> {
                                if (err.isEmpty()) {
                                    return created(root.get("id"));
                                }
                                return internalServerError();
                            }
                        );
                }
            );
    }

    @Authenticated
    @Restrict(@Group("STUDENT"))
    public CompletionStage<Result> requestReservationRemoval(String ref, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Reservation reservation = Ebean.find(Reservation.class).where().eq("externalRef", ref).findOne();
        return externalReservationHandler.removeReservation(reservation, user, "");
    }

    @Restrict(@Group("ADMIN"))
    public CompletionStage<Result> requestReservationRevocation(String ref, Http.Request request)
        throws MalformedURLException {
        Optional<Reservation> or = Ebean
            .find(Reservation.class)
            .where()
            .isNotNull("machine")
            .eq("externalRef", ref)
            .isNull("enrolment")
            .findOneOrEmpty();
        if (or.isEmpty()) {
            return CompletableFuture.completedFuture(notFound(String.format("No reservation with ref %s.", ref)));
        }

        Reservation reservation = or.get();
        DateTime now = DateTimeUtils.adjustDST(DateTime.now(), reservation);
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return CompletableFuture.completedFuture(forbidden("sitnet_reservation_in_effect"));
        }
        String roomRef = reservation.getMachine().getRoom().getExternalRef();
        URL url = parseUrl(configReader.getHomeOrganisationRef(), roomRef, reservation.getExternalRef());
        WSRequest wsRequest = wsClient.url(url.toString());

        Function<WSResponse, Result> onSuccess = response -> {
            if (response.getStatus() != Http.Status.OK) {
                JsonNode root = response.asJson();
                return internalServerError(root.get("message").asText("Connection refused"));
            }
            String msg = request.body().asJson().path("msg").asText("");
            emailComposer.composeExternalReservationCancellationNotification(reservation, msg);
            reservation.delete();
            return ok();
        };

        return wsRequest.delete().thenApplyAsync(onSuccess);
    }

    @Authenticated
    @Restrict(@Group("STUDENT"))
    public CompletionStage<Result> requestSlots(
        Long examId,
        String roomRef,
        Optional<String> org,
        Optional<String> date,
        Http.Request request
    )
        throws MalformedURLException {
        if (org.isPresent() && date.isPresent()) {
            // First check that exam exists
            User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
            ExamEnrolment ee = getEnrolment(examId, user);
            // For now do not allow making an external reservation for collaborative exam
            if (ee == null || ee.getCollaborativeExam() != null) {
                return wrapAsPromise(forbidden("sitnet_error_enrolment_not_found"));
            }
            Exam exam = ee.getExam();

            // Also sanity check the provided search date
            try {
                calendarHandler.parseSearchDate(date.get(), exam, null);
            } catch (NotFoundException e) {
                return wrapAsPromise(notFound());
            }
            // Ready to shoot
            String start = ISODateTimeFormat.dateTime().print(new DateTime(exam.getExamActiveStartDate()));
            String end = ISODateTimeFormat.dateTime().print(new DateTime(exam.getExamActiveEndDate()));
            Integer duration = exam.getDuration();
            URL url = parseUrl(org.get(), roomRef, date.get(), start, end, duration);
            WSRequest wsRequest = wsClient.url(url.toString().split("\\?")[0]).setQueryString(url.getQuery());
            Function<WSResponse, Result> onSuccess = response -> {
                JsonNode root = response.asJson();
                if (response.getStatus() != Http.Status.OK) {
                    return internalServerError(root.get("message").asText("Connection refused"));
                }
                Set<CalendarHandler.TimeSlot> slots = calendarHandler.postProcessSlots(root, date.get(), exam, user);
                return ok(Json.toJson(slots));
            };
            return wsRequest.get().thenApplyAsync(onSuccess);
        } else {
            return wrapAsPromise(badRequest());
        }
    }

    // helpers ->

    private Set<CalendarHandler.TimeSlot> getExamSlots(
        ExamRoom room,
        Integer examDuration,
        LocalDate date,
        Collection<ExamMachine> machines
    ) {
        Set<CalendarHandler.TimeSlot> slots = new LinkedHashSet<>();
        Collection<Interval> examSlots = calendarHandler.gatherSuitableSlots(room, date, examDuration);
        // Check machine availability for each slot
        for (Interval slot : examSlots) {
            // Check machine availability
            int availableMachineCount = (int) machines.stream().filter(m -> !isReservedDuring(m, slot)).count();
            slots.add(new CalendarHandler.TimeSlot(slot, availableMachineCount, null));
        }
        return slots;
    }

    /**
     * Search date is the current date if searching for current week or earlier,
     * If searching for upcoming weeks, day of week is one.
     */
    private LocalDate parseSearchDate(String day, String startDate, String endDate, ExamRoom room)
        throws NotFoundException {
        int windowSize = calendarHandler.getReservationWindowSize();
        int offset = room != null
            ? DateTimeZone.forID(room.getLocalTimezone()).getOffset(DateTime.now())
            : configReader.getDefaultTimeZone().getOffset(DateTime.now());
        LocalDate now = DateTime.now().plusMillis(offset).toLocalDate();
        LocalDate reservationWindowDate = now.plusDays(windowSize);
        LocalDate examEndDate = DateTime
            .parse(endDate, ISODateTimeFormat.dateTimeParser())
            .plusMillis(offset)
            .toLocalDate();
        LocalDate searchEndDate = reservationWindowDate.isBefore(examEndDate) ? reservationWindowDate : examEndDate;

        LocalDate examStartDate = DateTime
            .parse(startDate, ISODateTimeFormat.dateTimeParser())
            .plusMillis(offset)
            .toLocalDate();
        LocalDate searchDate = day.equals("") ? now : LocalDate.parse(day, ISODateTimeFormat.dateParser());
        searchDate = searchDate.withDayOfWeek(1);
        if (searchDate.isBefore(now)) {
            searchDate = now;
        }
        // if searching for month(s) after exam's end month -> no can do
        if (searchDate.isAfter(searchEndDate)) {
            throw new NotFoundException();
        }
        // Do not execute search before exam starts
        if (searchDate.isBefore(examStartDate)) {
            searchDate = examStartDate;
        }
        return searchDate;
    }

    /**
     * @return which one is sooner, exam period's end or week's end
     */
    private LocalDate getEndSearchDate(String endDate, LocalDate searchDate) {
        LocalDate examEnd = LocalDate.parse(endDate, ISODateTimeFormat.dateTimeParser());
        return calendarHandler.getEndSearchDate(searchDate, examEnd);
    }

    private boolean isReservedDuring(ExamMachine machine, Interval interval) {
        return machine.getReservations().stream().anyMatch(r -> interval.overlaps(r.toInterval()));
    }
}
