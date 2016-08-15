package controllers.iop;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.typesafe.config.ConfigFactory;
import controllers.CalendarController;
import controllers.SettingsController;
import controllers.base.ActionMethod;
import exceptions.NotFoundException;
import models.Exam;
import models.ExamMachine;
import models.ExamRoom;
import models.Reservation;
import models.User;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;
import util.AppUtil;

import javax.inject.Inject;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.*;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;


public class ExternalCalendarController extends CalendarController {

    @Inject
    protected WSClient wsClient;

    private static URL parseUrl(String orgRef, String facilityRef, String date, String start, String end, int duration)
            throws MalformedURLException {
        StringBuilder sb = new StringBuilder(ConfigFactory.load().getString("sitnet.integration.iop.host"));
        sb.append(String.format("/api/organisations/%s/facilities/%s/slots?", orgRef, facilityRef));
        sb.append(String.format("?date=%s&startAt=%s&endAt=%s&duration=%d", date, start, end, duration));
        return new URL(sb.toString());
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
            Stream<JsonNode> stream = StreamSupport.stream(root.spliterator(), false);
            Map<Interval, Optional<Integer>> map = stream.collect(Collectors.toMap(n -> {
                    DateTime start = ISODateTimeFormat.dateTimeParser().parseDateTime(n.get("start").asText());
                    DateTime end = ISODateTimeFormat.dateTimeParser().parseDateTime(n.get("end").asText());
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

    @ActionMethod
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
        reservation.setEndAt(end.toDate());
        reservation.setStartAt(start.toDate());
        reservation.setMachine(machine.get());
        reservation.setExternalUserRef(userEppn);

        Ebean.save(reservation);

        return created();
    }

    @ActionMethod
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
        DateTime now = AppUtil.adjustDST(DateTime.now(), reservation);
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return forbidden("sitnet_reservation_in_effect");
        }
        reservation.delete();
        return ok();
    };


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

    @ActionMethod
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


    // HELPERS -->

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
