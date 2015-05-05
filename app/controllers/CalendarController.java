package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import exceptions.NotFoundException;
import models.*;
import org.joda.time.*;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;
import util.java.EmailComposer;

import java.io.IOException;
import java.util.*;


public class CalendarController extends SitnetController {

    private static final DateTimeFormatter dateFormat = DateTimeFormat.forPattern("dd.MM.yyyyZZ");
    private static DateTimeFormatter dateTimeFormat = DateTimeFormat.forPattern("dd.MM.yyyy HH:mmZZ");


    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public static Result removeReservation(long id) throws NotFoundException {
        User user = UserController.getLoggedUser();
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("user.id", user.getId())
                .eq("reservation.id", id)
                .findUnique();
        if (enrolment == null) {
            throw new NotFoundException(String.format("No reservation with id %d for current user.", id));
        }
        // Removal not permitted if reservation is in the past or ongoing
        Reservation reservation = enrolment.getReservation();
        DateTime now = SitnetUtil.adjustDST(DateTime.now(), reservation);
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return forbidden("sitnet_reservation_in_effect");
        }

        // if user who removes reservation is not Student himself, send email
        if (!user.getId().equals(enrolment.getUser().getId())) {
            try {
                EmailComposer.composeReservationCancellationNotification(user, reservation, "");
            } catch (IOException e) {
                return internalServerError(e.getMessage());
            }
        }

        enrolment.setReservation(null);
        Ebean.save(enrolment);
        Ebean.delete(Reservation.class, id);

        return ok("removed");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result createReservation() {
        // Parse request body
        JsonNode json = request().body().asJson();
        Long roomId = json.get("roomId").asLong();
        Long examId = json.get("examId").asLong();
        Set<Integer> aids = new HashSet<>();
        if (json.has("aids")) {
            Iterator<JsonNode> it = json.get("aids").elements();
            while (it.hasNext()) {
                aids.add(it.next().asInt());
            }
        }
        DateTime start = DateTime.parse(json.get("start").asText(), dateTimeFormat);
        DateTime end = DateTime.parse(json.get("end").asText(), dateTimeFormat);
        if (start.isBeforeNow() || end.isBefore(start)) {
            return badRequest("invalid dates");
        }

        DateTime now = SitnetUtil.adjustDST(DateTime.now());
        User user = UserController.getLoggedUser();
        ExamRoom room = Ebean.find(ExamRoom.class, roomId);
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .where()
                .eq("user.id", user.getId())
                .eq("exam.id", examId)
                .eq("exam.state", Exam.State.PUBLISHED.toString())
                .disjunction()
                .isNull("reservation")
                .gt("reservation.startAt", now.toDate())
                .endJunction()
                .findUnique();
        if (enrolment == null) {
            return forbidden("sitnet_error_enrolment_not_found");
        }
        // no previous reservation or it's in the future
        // Removal not permitted if reservation is in the past or if exam is already started
        Reservation oldReservation = enrolment.getReservation();
        if (enrolment.getExam().getState().equals(Exam.State.STUDENT_STARTED.toString()) ||
                (oldReservation != null && oldReservation.toInterval().isBefore(DateTime.now()))) {
            return forbidden("sitnet_reservation_in_effect");
        }

        ExamMachine machine = getRandomMachine(room, enrolment.getExam(), start, end, aids);
        if (machine == null) {
            return forbidden("sitnet_no_machines_available");
        }

        Reservation reservation = new Reservation();
        reservation.setEndAt(end.toDate());
        reservation.setStartAt(start.toDate());
        reservation.setMachine(machine);
        reservation.setUser(user);

        Ebean.save(reservation);
        enrolment.setReservation(reservation);
        Ebean.save(enrolment);

        if (oldReservation != null) {
            Ebean.delete(oldReservation);
        }

        try {
            EmailComposer.composeReservationNotification(user, reservation, enrolment.getExam());
        } catch (IOException e) {
            Logger.error("Failed to send reservation confirmation email", e);
        }

        return ok("ok");
    }

    private static ExamMachine getRandomMachine(ExamRoom room, Exam exam, DateTime start, DateTime end, Collection<Integer> aids) {
        List<ExamMachine> machines = getEligibleMachines(room, aids, exam);
        Collections.shuffle(machines);
        Interval wantedTime = new Interval(start, end);
        for (ExamMachine machine : machines) {
            if (!isReservedDuring(machine, wantedTime)) {
                return machine;
            }
        }
        return null;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getSlots(Long examId, Long roomId, String day, List<Integer> aids) {
        Exam exam = getEnrolledExam(examId);
        if (exam == null) {
            return notFound("sitnet_error_enrolment_not_found");
        }
        ExamRoom room = Ebean.find(ExamRoom.class, roomId);
        if (room == null) {
            return notFound(String.format("No room with id: (%d)", roomId));
        }
        Map<String, List<FreeTimeSlot>> slots = new HashMap<>();
        if (!room.getOutOfService() && !room.getState().equals(ExamRoom.State.INACTIVE.toString()) &&
                isRoomAccessibilitySatisfied(room, aids) && exam.getDuration() != null) {
            LocalDate searchDate;
            try {
                searchDate = parseSearchDate(day, exam);
            } catch (NotFoundException e) {
                ObjectNode node = Json.newObject();
                node.put("cause", "EXAM_NOT_ACTIVE_TODAY");
                return notFound(Json.toJson(node));
            }
            // users reservations starting from now
            List<Reservation> reservations = Ebean.find(Reservation.class)
                    .where()
                    .eq("user", UserController.getLoggedUser())
                    .gt("startAt", searchDate.toDate())
                    .findList();
            // Resolve eligible machines based on software and accessibility requirements
            List<ExamMachine> machines = getEligibleMachines(room, aids, exam);
            LocalDate endOfSearch = getEndSearchDate(exam, searchDate);
            while (!searchDate.isAfter(endOfSearch)) {
                List<FreeTimeSlot> freeTimeSlots = getFreeTimes(room, exam, searchDate, reservations, machines);
                if (!freeTimeSlots.isEmpty()) {
                    String key = DateTimeFormat.forPattern("dd.MM.yyyy").print(searchDate);
                    slots.put(key, freeTimeSlots);
                }
                searchDate = searchDate.plusDays(1);
            }
        }
        return ok(Json.toJson(slots));
    }

    /**
     * Queries for available slots for given room and day
     */
    private static List<FreeTimeSlot> getFreeTimes(
            ExamRoom room, Exam exam, LocalDate date, List<Reservation> reservations, List<ExamMachine> machines) {

        List<FreeTimeSlot> freeTimes = new ArrayList<>();

        List<Interval> eligibleSlots = new ArrayList<>();
        // Resolve the opening hours for room and day
        List<ExamRoom.OpeningHours> openingHours = room.getWorkingHoursForDate(date);
        if (openingHours.isEmpty()) {
            return freeTimes;
        }
        // Check machine availability for each slot
        for (Interval slot : allSlots(openingHours, room, date)) {
            if (hasReservationsDuring(reservations, slot)) {
                // User has reservations during this time
                continue;
            }
            for (ExamMachine machine : machines) {
                if (isReservedDuring(machine, slot)) {
                    // Machine has reservations during this time
                    continue;
                }
                eligibleSlots.add(slot);
                break;
            }
        }
        // Get suitable slots based on exam duration
        Integer examDuration = exam.getDuration();
        for (Interval slot : eligibleSlots) {
            DateTime beginning = slot.getStart();
            DateTime openUntil = getEndOfOpeningHours(beginning, openingHours, room.getTimezoneOffset(date));
            if (!beginning.plusMinutes(examDuration).isAfter(openUntil)) {
                DateTime end = beginning.plusMinutes(examDuration);
                freeTimes.add(new FreeTimeSlot(new Interval(beginning, end)));
            }
        }
        return freeTimes;
    }

    // HELPERS -->

    /**
     * Search date is the current date if searching for current month or earlier,
     * If searching for upcoming months, day of month is one.
     */
    private static LocalDate parseSearchDate(String day, Exam exam) throws NotFoundException {
        LocalDate examEndDate = new LocalDate(exam.getExamActiveEndDate());
        LocalDate examStartDate = new LocalDate(exam.getExamActiveStartDate());
        LocalDate searchDate = day.equals("") ? LocalDate.now() : LocalDate.parse(day, dateFormat);
        searchDate = searchDate.withDayOfMonth(1);
        if (searchDate.isBefore(LocalDate.now())) {
            searchDate = LocalDate.now();
        }
        // if searching for month(s) after exam's end month -> no can do
        if (searchDate.isAfter(examEndDate)) {
            throw new NotFoundException();
        }
        // Do not execute search before exam starts
        if (searchDate.isBefore(examStartDate)) {
            searchDate = examStartDate;
        }
        return searchDate;
    }

    /**
     * @return which one is sooner, exam period's end or month's end
     */
    private static LocalDate getEndSearchDate(Exam exam, LocalDate searchDate) {
        LocalDate endOfMonth = searchDate.dayOfMonth().withMaximumValue();
        LocalDate examEnd = new LocalDate(exam.getExamActiveEndDate());
        return endOfMonth.isBefore(examEnd) ? endOfMonth : examEnd;
    }

    private static Exam getEnrolledExam(Long examId) {
        User user = UserController.getLoggedUser();
        DateTime now = SitnetUtil.adjustDST(DateTime.now());
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where()
                .eq("user", user)
                .eq("exam.id", examId)
                .eq("exam.state", Exam.State.PUBLISHED.toString())
                .disjunction()
                .isNull("reservation")
                .gt("reservation.startAt", now.toDate())
                .endJunction()
                .findUnique();
        return enrolment == null ? null : enrolment.getExam();
    }

    /**
     * @return all intervals that fall within provided working hours
     */
    private static List<Interval> allSlots(List<ExamRoom.OpeningHours> openingHours, ExamRoom room, LocalDate date) {
        List<Interval> intervals = new ArrayList<>();
        List<ExamStartingHour> startingHours = room.getExamStartingHours();
        if (startingHours.isEmpty()) {
            // Default to 1 hour slots that start at the hour
            startingHours = createDefaultStartingHours(room.getLocalTimezone());
        }
        Collections.sort(startingHours);
        DateTime now = DateTime.now().plusMillis(DateTimeZone.forID(room.getLocalTimezone()).getOffset(DateTime.now()));
        for (ExamRoom.OpeningHours oh : openingHours) {
            int tzOffset = oh.getTimezoneOffset();
            DateTime beginning = now.getDayOfYear() == date.getDayOfYear() ?
                    nextStartingTime(now, startingHours, tzOffset) :
                    nextStartingTime(oh.getHours().getStart(), startingHours, tzOffset);
            DateTime slotEnd = oh.getHours().getEnd();
            while (beginning != null) {
                DateTime nextBeginning = nextStartingTime(beginning.plusMillis(1), startingHours, tzOffset);
                if (nextBeginning != null && !nextBeginning.isAfter(slotEnd)) {
                    intervals.add(new Interval(beginning.minusMillis(tzOffset), nextBeginning.minusMillis(tzOffset)));
                    beginning = nextBeginning;
                } else if (beginning.isBefore(slotEnd)) {
                    // We have some spare time in the end, take it as well
                    intervals.add(new Interval(beginning.minusMillis(tzOffset), slotEnd.minusMillis(tzOffset)));
                    break;
                } else {
                    break;
                }
            }
        }
        return intervals;
    }

    private static boolean isReservedDuring(ExamMachine machine, Interval interval) {
        return hasReservationsDuring(machine.getReservations(), interval);
    }

    private static boolean hasReservationsDuring(Collection<Reservation> reservations, Interval interval) {
        for (Reservation reservation : reservations) {
            if (interval.overlaps(reservation.toInterval())) {
                return true;
            }
        }
        return false;
    }

    private static List<ExamMachine> getEligibleMachines(ExamRoom room, Collection<Integer> access, Exam exam) {
        List<ExamMachine> candidates = Ebean.find(ExamMachine.class)
                .where()
                .eq("room.id", room.getId())
                .ne("outOfService", true)
                .ne("archived", true)
                .findList();
        Iterator<ExamMachine> it = candidates.listIterator();
        while (it.hasNext()) {
            ExamMachine machine = it.next();
            if (!isMachineAccessibilitySatisfied(machine, access)) {
                it.remove();
            }
            if (!hasRequiredSoftware(machine, exam)) {
                it.remove();
            }
        }
        return candidates;
    }

    private static boolean isRoomAccessibilitySatisfied(ExamRoom room, Collection<Integer> wanted) {
        List<Accessibility> roomAccessibility = room.getAccessibility();
        List<Integer> roomAccessibilityIds = new ArrayList<>();
        for (Accessibility accessibility : roomAccessibility) {
            roomAccessibilityIds.add(accessibility.getId().intValue());
        }
        return roomAccessibilityIds.containsAll(wanted);
    }

    // TODO: this room vs machine accessibility needs some UI work and rethinking.
    private static boolean isMachineAccessibilitySatisfied(ExamMachine machine, Collection<Integer> wanted) {
        if (machine.isAccessible()) { // this has it all :)
            return true;
        }
        // The following is always empty because no UI-support for adding
        List<Accessibility> machineAccessibility = machine.getAccessibility();
        List<Integer> machineAccessibilityIds = new ArrayList<>();
        for (Accessibility accessibility : machineAccessibility) {
            machineAccessibilityIds.add(accessibility.getId().intValue());
        }
        return machineAccessibilityIds.containsAll(wanted);
    }

    private static boolean hasRequiredSoftware(ExamMachine machine, Exam exam) {
        return machine.getSoftwareInfo().containsAll(exam.getSoftwareInfo());
    }

    private static DateTime nextStartingTime(DateTime instant, List<ExamStartingHour> startingHours, int offset) {
        for (ExamStartingHour esh : startingHours) {
            DateTime datetime = instant.withMillisOfDay(new LocalTime(esh.getStartingHour()).plusMillis(offset).getMillisOfDay());
            if (!datetime.isBefore(instant)) {
                return datetime;
            }
        }
        return null;
    }

    private static List<ExamStartingHour> createDefaultStartingHours(String roomTz) {
        // Get offset from Jan 1st in order to no have DST in effect
        DateTimeZone zone = DateTimeZone.forID(roomTz);
        DateTime beginning = DateTime.now().withDayOfYear(1).withTimeAtStartOfDay();
        DateTime ending = beginning.plusHours(23);
        List<ExamStartingHour> hours = new ArrayList<>();
        while (!beginning.isAfter(ending)) {
            ExamStartingHour esh = new ExamStartingHour();
            esh.setStartingHour(beginning.toDate());
            esh.setTimezoneOffset(zone.getOffset(beginning));
            hours.add(esh);
            beginning = beginning.plusHours(1);
        }
        return hours;
    }

    private static DateTime getEndOfOpeningHours(DateTime instant, List<ExamRoom.OpeningHours> openingHours, int offset) {
        for (ExamRoom.OpeningHours oh : openingHours) {
            if (oh.getHours().contains(instant.plusMillis(oh.getTimezoneOffset()))) {
                return oh.getHours().getEnd().minusMillis(oh.getTimezoneOffset());
            }
        }
        // should not occur, indicates programming error
        throw new RuntimeException("slot not contained within opening hours, recheck logic!");
    }


    private static class FreeTimeSlot {
        private final String start;
        private final String end;

        public FreeTimeSlot(Interval interval) {
            start = dateTimeFormat.print(interval.getStart());
            end = dateTimeFormat.print(interval.getEnd());
        }

        public String getStart() {
            return start;
        }

        public String getEnd() {
            return end;
        }
    }

}