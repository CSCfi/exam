/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package controllers.iop;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import io.ebean.Ebean;
import io.ebean.text.PathProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import controllers.CalendarController;
import controllers.SettingsController;
import exceptions.NotFoundException;
import models.Exam;
import models.ExamEnrolment;
import models.ExamMachine;
import models.ExamRoom;
import models.MailAddress;
import models.Reservation;
import models.User;
import models.iop.ExternalReservation;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.format.DateTimeFormatter;
import org.joda.time.format.ISODateTimeFormat;
import play.Logger;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;

import javax.inject.Inject;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.*;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;


public class ExternalCalendarController extends CalendarController {

    @Inject
    private WSClient wsClient;

    private static URL parseUrl(String orgRef, String facilityRef, String date, String start, String end, int duration)
            throws MalformedURLException {
        String url = ConfigFactory.load().getString("sitnet.integration.iop.host") +
                String.format("/api/organisations/%s/facilities/%s/slots", orgRef, facilityRef) +
                String.format("?date=%s&startAt=%s&endAt=%s&duration=%d", date, start, end, duration);
        return new URL(url);
    }

    private static URL parseUrl(String orgRef, String facilityRef)
            throws MalformedURLException {
        return new URL(ConfigFactory.load().getString("sitnet.integration.iop.host")
                + String.format("/api/organisations/%s/facilities/%s/reservations", orgRef, facilityRef));
    }

    private Set<TimeSlot> postProcessSlots(JsonNode node, String date, Exam exam, User user) {
        // Filter out slots that user has a conflicting reservation with
        if (node.isArray()) {
            ArrayNode root = (ArrayNode) node;
            LocalDate searchDate = LocalDate.parse(date, ISODateTimeFormat.dateParser());
            // users reservations starting from now
            List<Reservation> reservations = Ebean.find(Reservation.class)
                    .fetch("enrolment.exam")
                    .where()
                    .eq("user", user)
                    .gt("startAt", searchDate.toDate())
                    .findList();
            DateTimeFormatter dtf = ISODateTimeFormat.dateTimeParser();
            Stream<JsonNode> stream = StreamSupport.stream(root.spliterator(), false);
            Map<Interval, Optional<Integer>> map = stream.collect(Collectors.toMap(n -> {
                        DateTime start = dtf.parseDateTime(n.get("start").asText());
                        DateTime end = dtf.parseDateTime(n.get("end").asText());
                        return new Interval(start, end);
                    }, n -> Optional.of(n.get("availableMachines").asInt()),
                    (u, v) -> {
                        throw new IllegalStateException(String.format("Duplicate key %s", u));
                    },
                    LinkedHashMap::new));
            return handleReservations(map, reservations, exam, null, user);
        }
        return Collections.emptySet();
    }

    // Actions invoked by central IOP server

    @SubjectNotPresent
    public Result provideReservation() {
        // Parse request body
        JsonNode node = request().body().asJson();
        String reservationRef = node.get("id").asText();
        String roomRef = node.get("roomId").asText();
        DateTime start = ISODateTimeFormat.dateTimeParser().parseDateTime(node.get("start").asText());
        DateTime end = ISODateTimeFormat.dateTimeParser().parseDateTime(node.get("end").asText());
        String userEppn = node.get("user").asText();
        if (start.isBeforeNow() || end.isBefore(start)) {
            return badRequest("invalid dates");
        }
        ExamRoom room = Ebean.find(ExamRoom.class).where().eq("externalRef", roomRef).findUnique();
        if (room == null) {
            return notFound("room not found");
        }
        Optional<ExamMachine> machine = getRandomMachine(room, null, start, end, Collections.emptyList());
        if (!machine.isPresent()) {
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

    @SubjectNotPresent
    public Result removeProvidedReservation(String ref) {
        Reservation reservation = Ebean.find(Reservation.class)
                .fetch("machine")
                .fetch("machine.room")
                .where()
                .eq("externalRef", ref)
                .findUnique();
        if (reservation == null) {
            return notFound("reservation not found");
        }
        // TODO: might need additional checks
        DateTime now = AppUtil.adjustDST(DateTime.now(), reservation);
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return forbidden("sitnet_reservation_in_effect");
        }
        reservation.delete();
        return ok();
    }

    @SubjectNotPresent
    public Result provideSlots(Optional<String> roomId, Optional<String> date, Optional<String> start, Optional<String> end,
                               Optional<Integer> duration) {
        if (roomId.isPresent() && date.isPresent() && start.isPresent() && end.isPresent() && duration.isPresent()) {
            ExamRoom room = Ebean.find(ExamRoom.class).where().eq("externalRef", roomId.get()).findUnique();
            if (room == null) {
                return forbidden(String.format("No room with ref: (%s)", roomId.get()));
            }
            Collection<TimeSlot> slots = new ArrayList<>();
            if (!room.getOutOfService() && !room.getState().equals(ExamRoom.State.INACTIVE.toString())) {
                LocalDate searchDate;
                try {
                    searchDate = parseSearchDate(date.get(), start.get(), end.get(), room);
                } catch (NotFoundException e) {
                    return notFound();
                }
                List<ExamMachine> machines = Ebean.find(ExamMachine.class)
                        .where()
                        .eq("room.id", room.getId())
                        .ne("outOfService", true)
                        .ne("archived", true)
                        .findList();
                LocalDate endOfSearch = getEndSearchDate(end.get(), searchDate);
                while (!searchDate.isAfter(endOfSearch)) {
                    Set<TimeSlot> timeSlots = getExamSlots(room, duration.get(), searchDate, machines);
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
    @Restrict(@Group("STUDENT"))
    public CompletionStage<Result> requestReservation() throws MalformedURLException {
        User user = getLoggedUser();
        // Parse request body
        JsonNode node = request().body().asJson();
        String homeOrgRef = ConfigFactory.load().getString("sitnet.integration.iop.organisationRef");
        String orgRef = node.get("orgId").asText();
        String roomRef = node.get("roomId").asText();
        DateTime start = ISODateTimeFormat.dateTimeParser().parseDateTime(node.get("start").asText());
        DateTime end = ISODateTimeFormat.dateTimeParser().parseDateTime(node.get("end").asText());
        Long examId = node.get("examId").asLong();
        if (start.isBeforeNow() || end.isBefore(start)) {
            return wrapAsPromise(badRequest("invalid dates"));
        }
        //TODO: See if this offset thing works as intended
        DateTime now = AppUtil.adjustDST(DateTime.now());
        final ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .where()
                .eq("user.id", user.getId())
                .eq("exam.id", examId)
                .eq("exam.state", Exam.State.PUBLISHED)
                .disjunction()
                .isNull("reservation")
                .gt("reservation.startAt", now.toDate())
                .endJunction()
                .findUnique();
        Optional<Result> error = checkEnrolment(enrolment, user);
        if (error.isPresent()) {
            return wrapAsPromise(error.get());
        }
        // Lets do this
        URL url = parseUrl(orgRef, roomRef);
        ObjectNode body = Json.newObject();
        body.put("requestingOrg", homeOrgRef);
        body.put("start", ISODateTimeFormat.dateTime().print(start));
        body.put("end", ISODateTimeFormat.dateTime().print(end));
        body.put("user", user.getEppn());
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, Result> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != 201) {
                return internalServerError(root.get("message").asText("Connection refused"));
            }
            handleExternalReservation(enrolment, root, start, end, user, orgRef, roomRef);
            return created(root.get("id"));
        };
        return request.post(body).thenApplyAsync(onSuccess);
    }

    @Restrict(@Group("STUDENT"))
    public CompletionStage<Result> requestReservationRemoval(String ref) throws MalformedURLException {
        User user = getLoggedUser();
        Reservation reservation = Ebean.find(Reservation.class).where().eq("externalRef", ref).findUnique();
        return externalReservationHandler.removeReservation(reservation, user);
    }

    @Restrict(@Group("STUDENT"))
    public CompletionStage<Result> requestSlots(Long examId, String roomRef, Optional<String> org, Optional<String> date)
            throws MalformedURLException {
        if (org.isPresent() && date.isPresent()) {
            // First check that exam exists
            User user = getLoggedUser();
            Exam exam = getEnrolledExam(examId, user);
            if (exam == null) {
                return wrapAsPromise(forbidden("sitnet_error_enrolment_not_found"));
            }

            // Also sanity check the provided search date
            try {
                parseSearchDate(date.get(), exam, null);
            } catch (NotFoundException e) {
                return wrapAsPromise(notFound());
            }
            // Ready to shoot
            String start = ISODateTimeFormat.dateTime().print(new DateTime(exam.getExamActiveStartDate()));
            String end = ISODateTimeFormat.dateTime().print(new DateTime(exam.getExamActiveEndDate()));
            Integer duration = exam.getDuration();
            URL url = parseUrl(org.get(), roomRef, date.get(), start, end, duration);
            WSRequest request = wsClient.url(url.toString().split("\\?")[0]).setQueryString(url.getQuery());
            Function<WSResponse, Result> onSuccess = response -> {
                JsonNode root = response.asJson();
                if (response.getStatus() != 200) {
                    return internalServerError(root.get("message").asText("Connection refused"));
                }
                Set<TimeSlot> slots = postProcessSlots(root, date.get(), exam, user);
                return ok(Json.toJson(slots));
            };
            return request.get().thenApplyAsync(onSuccess);
        } else {
            return wrapAsPromise(badRequest());
        }
    }

    // helpers ->

    private void handleExternalReservation(ExamEnrolment enrolment, JsonNode node, DateTime start, DateTime end,
                                           User user, String orgRef, String roomRef) {
        Reservation oldReservation = enrolment.getReservation();
        final Reservation reservation = new Reservation();
        reservation.setEndAt(end);
        reservation.setStartAt(start);
        reservation.setUser(user);
        reservation.setExternalRef(node.get("id").asText());

        // If this is due in less than a day, make sure we won't send a reminder
        if (start.minusDays(1).isBeforeNow()) {
            reservation.setReminderSent(true);
        }

        ExternalReservation external = new ExternalReservation();
        external.setOrgRef(orgRef);
        external.setRoomRef(roomRef);
        JsonNode machineNode = node.get("machine");
        JsonNode roomNode = machineNode.get("room");
        external.setMachineName(machineNode.get("name").asText());
        external.setRoomName(roomNode.get("name").asText());
        external.setRoomCode(roomNode.get("roomCode").asText());
        external.setRoomTz(roomNode.get("localTimezone").asText());
        external.setRoomInstruction(roomNode.path("roomInstruction").asText(null));
        external.setRoomInstructionEN(roomNode.path("roomInstructionEN").asText(null));
        external.setRoomInstructionSV(roomNode.path("roomInstructionSV").asText(null));
        external.save();
        reservation.setExternalReservation(external);
        Ebean.save(reservation);
        enrolment.setReservation(reservation);
        enrolment.setReservationCanceled(false);
        Ebean.save(enrolment);

        // Finally nuke the old reservation if any
        if (oldReservation != null) {
            Ebean.delete(oldReservation);
        }
        Exam exam = enrolment.getExam();
        // Attach the external machine data just so that email can be generated
        reservation.setMachine(parseExternalMachineData(machineNode));
        // Send some emails asynchronously
        system.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            emailComposer.composeReservationNotification(user, reservation, exam, false);
            Logger.info("Reservation confirmation email sent to {}", user.getEmail());
        }, system.dispatcher());
    }

    private ExamMachine parseExternalMachineData(JsonNode machineNode) {
        ExamMachine machine = new ExamMachine();
        machine.setName(machineNode.get("name").asText());
        JsonNode roomNode = machineNode.get("room");
        ExamRoom room = new ExamRoom();
        room.setName(roomNode.get("name").asText());
        room.setLocalTimezone(roomNode.get("localTimezone").asText());
        if (roomNode.has("roomCode")) {
            room.setRoomCode(roomNode.get("roomCode").asText());
        }
        if (roomNode.has("buildingName")) {
            room.setBuildingName(roomNode.get("buildingName").asText());
        }
        if (roomNode.has("roomInstruction")) {
            room.setRoomInstruction(roomNode.get("roomInstruction").asText());
        }
        if (roomNode.has("roomInstructionEN")) {
            room.setRoomInstruction(roomNode.get("roomInstructionEN").asText());
        }
        if (roomNode.has("roomInstructionSV")) {
            room.setRoomInstruction(roomNode.get("roomInstructionSV").asText());
        }
        JsonNode addressNode = roomNode.get("mailAddress");
        MailAddress address = new MailAddress();
        address.setStreet(addressNode.get("street").asText());
        address.setCity(addressNode.get("city").asText());
        address.setZip(addressNode.get("zip").asText());
        room.setMailAddress(address);
        machine.setRoom(room);
        return machine;
    }


    private Set<TimeSlot> getExamSlots(ExamRoom room, Integer examDuration, LocalDate date, Collection<ExamMachine> machines) {
        Set<TimeSlot> slots = new LinkedHashSet<>();
        Collection<Interval> examSlots = gatherSuitableSlots(room, date, examDuration);
        // Check machine availability for each slot
        for (Interval slot : examSlots) {
            // Check machine availability
            int availableMachineCount = machines.stream()
                    .filter(m -> !isReservedDuring(m, slot))
                    .collect(Collectors.toList())
                    .size();
            slots.add(new TimeSlot(slot, availableMachineCount, null));
        }
        return slots;
    }

    /**
     * Search date is the current date if searching for current week or earlier,
     * If searching for upcoming weeks, day of week is one.
     */
    private static LocalDate parseSearchDate(String day, String startDate, String endDate, ExamRoom room) throws NotFoundException {
        String reservationWindow = SettingsController.getOrCreateSettings(
                "reservation_window_size", null, null).getValue();
        int windowSize = 0;
        if (reservationWindow != null) {
            windowSize = Integer.parseInt(reservationWindow);
        }
        int offset = room != null ?
                DateTimeZone.forID(room.getLocalTimezone()).getOffset(DateTime.now()) :
                AppUtil.getDefaultTimeZone().getOffset(DateTime.now());
        LocalDate now = DateTime.now().plusMillis(offset).toLocalDate();
        LocalDate reservationWindowDate = now.plusDays(windowSize);
        LocalDate examEndDate = DateTime.parse(endDate, ISODateTimeFormat.dateTimeParser()).plusMillis(offset).toLocalDate();
        LocalDate searchEndDate = reservationWindowDate.isBefore(examEndDate) ? reservationWindowDate : examEndDate;

        LocalDate examStartDate = DateTime.parse(startDate, ISODateTimeFormat.dateTimeParser()).plusMillis(offset).toLocalDate();
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
    private static LocalDate getEndSearchDate(String endDate, LocalDate searchDate) {
        LocalDate endOfWeek = searchDate.dayOfWeek().withMaximumValue();
        LocalDate examEnd = LocalDate.parse(endDate, ISODateTimeFormat.dateTimeParser());
        String reservationWindow = SettingsController.getOrCreateSettings(
                "reservation_window_size", null, null).getValue();
        int windowSize = 0;
        if (reservationWindow != null) {
            windowSize = Integer.parseInt(reservationWindow);
        }
        LocalDate reservationWindowDate = LocalDate.now().plusDays(windowSize);
        LocalDate endOfSearchDate = examEnd.isBefore(reservationWindowDate) ? examEnd : reservationWindowDate;

        return endOfWeek.isBefore(endOfSearchDate) ? endOfWeek : endOfSearchDate;
    }

    private boolean isReservedDuring(ExamMachine machine, Interval interval) {
        return machine.getReservations()
                .stream()
                .anyMatch(r -> interval.overlaps(r.toInterval()));
    }

}
