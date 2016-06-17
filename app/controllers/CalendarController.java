package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import exceptions.NotFoundException;
import models.*;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.*;
import org.joda.time.format.ISODateTimeFormat;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;


public class CalendarController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem system;

    private static final int LAST_HOUR = 23;

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result removeReservation(long id) throws NotFoundException {
        User user = getLoggedUser();
        final ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
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
        final Reservation reservation = enrolment.getReservation();
        DateTime now = AppUtil.adjustDST(DateTime.now(), reservation);
        if (reservation.toInterval().isBefore(now) || reservation.toInterval().contains(now)) {
            return forbidden("sitnet_reservation_in_effect");
        }
        enrolment.setReservation(null);
        enrolment.setReservationCanceled(true);
        Ebean.save(enrolment);
        Ebean.delete(Reservation.class, id);

        // send email asynchronously
        final boolean isStudentUser = user.equals(enrolment.getUser());
        system.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            emailComposer.composeReservationCancellationNotification(enrolment.getUser(), reservation, "", isStudentUser, enrolment);
            Logger.info("Reservation cancellation confirmation email sent");
        }, system.dispatcher());
        return ok("removed");
    }


    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result createReservation() {
        // Parse request body
        JsonNode json = request().body().asJson();
        Long roomId = json.get("roomId").asLong();
        Long examId = json.get("examId").asLong();
        Collection<Integer> aids = new HashSet<>();
        if (json.has("aids")) {
            Iterator<JsonNode> it = json.get("aids").elements();
            while (it.hasNext()) {
                aids.add(it.next().asInt());
            }
        }
        DateTime start = DateTime.parse(json.get("start").asText(), ISODateTimeFormat.dateTimeParser());
        DateTime end = DateTime.parse(json.get("end").asText(), ISODateTimeFormat.dateTimeParser());
        if (start.isBeforeNow() || end.isBefore(start)) {
            return badRequest("invalid dates");
        }

        ExamRoom room = Ebean.find(ExamRoom.class, roomId);
        DateTime now = AppUtil.adjustDST(DateTime.now(), room);
        final User user = getLoggedUser();
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
        if (enrolment == null) {
            return forbidden("sitnet_error_enrolment_not_found");
        }
        // Removal not permitted if old reservation is in the past or if exam is already started
        Reservation oldReservation = enrolment.getReservation();
        if (enrolment.getExam().getState() == Exam.State.STUDENT_STARTED ||
                (oldReservation != null && oldReservation.toInterval().isBefore(DateTime.now()))) {
            return forbidden("sitnet_reservation_in_effect");
        }
        // No previous reservation or it's in the future
        // If no previous reservation, check if allowed to participate. This check is skipped if user already
        // has a reservation to this exam so that change of reservation is always possible.
        if (oldReservation == null && !isAllowedToParticipate(enrolment.getExam(), user, emailComposer)) {
            return forbidden("sitnet_no_trials_left");
        }

        Optional<ExamMachine>  machine = getRandomMachine(room, enrolment.getExam(), start, end, aids);
        if (!machine.isPresent()) {
            return forbidden("sitnet_no_machines_available");
        }

        // We are good to go :)
        final Reservation reservation = new Reservation();
        reservation.setEndAt(end.toDate());
        reservation.setStartAt(start.toDate());
        reservation.setMachine(machine.get());
        reservation.setUser(user);

        Ebean.save(reservation);
        enrolment.setReservation(reservation);
        enrolment.setReservationCanceled(false);
        Ebean.save(enrolment);

        // Finally nuke the old reservation if any
        if (oldReservation != null) {
            Ebean.delete(oldReservation);
        }
        Exam exam = enrolment.getExam();

        // Send some emails asynchronously
        system.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            emailComposer.composeReservationNotification(user, reservation, exam);
            Logger.info("Reservation confirmation email sent to {}", user.getEmail());
        }, system.dispatcher());

        return ok("ok");
    }

    private Optional<ExamMachine> getRandomMachine(ExamRoom room, Exam exam, DateTime start, DateTime end, Collection<Integer> aids) {
        List<ExamMachine> machines = getEligibleMachines(room, aids, exam);
        Collections.shuffle(machines);
        Interval wantedTime = new Interval(start, end);
        for (ExamMachine machine : machines) {
            if (!machine.isReservedDuring(wantedTime)) {
                return Optional.of(machine);
            }
        }
        return Optional.empty();
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result getSlots(Long examId, Long roomId, String day, Collection<Integer> aids) {
        User user = getLoggedUser();
        Exam exam = getEnrolledExam(examId, user);
        if (exam == null) {
            return forbidden("sitnet_error_enrolment_not_found");
        }
        ExamRoom room = Ebean.find(ExamRoom.class, roomId);
        if (room == null) {
            return forbidden(String.format("No room with id: (%d)", roomId));
        }
        Collection<TimeSlot> slots = new ArrayList<>();
        if (!room.getOutOfService() && !room.getState().equals(ExamRoom.State.INACTIVE.toString()) &&
                isRoomAccessibilitySatisfied(room, aids) && exam.getDuration() != null) {
            LocalDate searchDate;
            try {
                searchDate = parseSearchDate(day, exam, room);
            } catch (NotFoundException e) {
                return notFound();
            }
            // users reservations starting from now
            List<Reservation> reservations = Ebean.find(Reservation.class)
                    .fetch("enrolment.exam")
                    .where()
                    .eq("user", user)
                    .gt("startAt", searchDate.toDate())
                    .findList();
            // Resolve eligible machines based on software and accessibility requirements
            List<ExamMachine> machines = getEligibleMachines(room, aids, exam);
            LocalDate endOfSearch = getEndSearchDate(exam, searchDate);
            while (!searchDate.isAfter(endOfSearch)) {
                Set<TimeSlot> timeSlots = getExamSlots(user, room, exam, searchDate, reservations, machines);
                if (!timeSlots.isEmpty()) {
                    slots.addAll(timeSlots);
                }
                searchDate = searchDate.plusDays(1);
            }
        }
        return ok(Json.toJson(slots));
    }

    /**
     * Queries for slots for given room and day
     */
    private Set<TimeSlot> getExamSlots(
            User user, ExamRoom room, Exam exam, LocalDate date, Collection<Reservation> reservations,
            Collection<ExamMachine> machines) {

        Set<TimeSlot> slots = new LinkedHashSet<>();
        // Resolve the opening hours for room and day
        List<ExamRoom.OpeningHours> openingHours = room.getWorkingHoursForDate(date);
        if (openingHours.isEmpty()) {
            return slots;
        }

        // Get suitable slots based on exam duration
        Collection<Interval> examSlots = new ArrayList<>();
        Integer examDuration = exam.getDuration();
        for (Interval slot : allSlots(openingHours, room, date)) {
            DateTime beginning = slot.getStart();
            DateTime openUntil = getEndOfOpeningHours(beginning, openingHours);
            if (!beginning.plusMinutes(examDuration).isAfter(openUntil)) {
                DateTime end = beginning.plusMinutes(examDuration);
                examSlots.add(new Interval(beginning, end));
            }
        }

        // Check reservation status and machine availability for each slot
        for (Interval slot : examSlots) {
            List<Reservation> conflicting = getReservationsDuring(reservations, slot);
            if (!conflicting.isEmpty()) {
                Optional<Reservation> concernsAnotherExam = conflicting.stream()
                        .filter(c -> !c.getEnrolment().getExam().equals(exam))
                        .findFirst();
                if (concernsAnotherExam.isPresent()) {
                    // User has a reservation to another exam, do not allow making overlapping reservations
                    Reservation reservation = concernsAnotherExam.get();
                    String conflictingExam = reservation.getEnrolment().getExam().getName();
                    slots.add(new TimeSlot(reservation.toInterval(), -1, conflictingExam));
                    continue;
                } else {
                    // User has an existing reservation to this exam
                    Reservation reservation = conflicting.get(0);
                    if (!reservation.toInterval().equals(slot)) {
                        // No matching slot found in this room, add the reservation as-is.
                        slots.add(new TimeSlot(reservation.toInterval(), -1, null));
                    } else {
                        // This is exactly the same slot, avoid duplicates and continue.
                        slots.add(new TimeSlot(slot, -1, null));
                        continue;
                    }
                }
            }
            // Check machine availability
            int availableMachineCount = machines.stream()
                    .filter(m -> !isReservedByOthersDuring(m, slot, user))
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
    private static LocalDate parseSearchDate(String day, Exam exam, ExamRoom room) throws NotFoundException {
        String reservationWindow = SettingsController.getOrCreateSettings(
                "reservation_window_size", null, null).getValue();
        int windowSize = 0;
        if (reservationWindow != null) {
            windowSize = Integer.parseInt(reservationWindow);
        }
        int offset = DateTimeZone.forID(room.getLocalTimezone()).getOffset(DateTime.now());
        LocalDate now = DateTime.now().plusMillis(offset).toLocalDate();
        LocalDate reservationWindowDate = now.plusDays(windowSize);
        LocalDate examEndDate = new DateTime(exam.getExamActiveEndDate()).plusMillis(offset).toLocalDate();
        LocalDate searchEndDate = reservationWindowDate.isBefore(examEndDate) ? reservationWindowDate : examEndDate;
        LocalDate examStartDate = new DateTime(exam.getExamActiveStartDate()).plusMillis(offset).toLocalDate();
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
    private static LocalDate getEndSearchDate(Exam exam, LocalDate searchDate) {
        LocalDate endOfWeek = searchDate.dayOfWeek().withMaximumValue();
        LocalDate examEnd = new LocalDate(exam.getExamActiveEndDate());
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

    private Exam getEnrolledExam(Long examId, User user) {
        DateTime now = AppUtil.adjustDST(DateTime.now());
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where()
                .eq("user", user)
                .eq("exam.id", examId)
                .eq("exam.state", Exam.State.PUBLISHED)
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
    private static Iterable<Interval> allSlots(Iterable<ExamRoom.OpeningHours> openingHours, ExamRoom room, LocalDate date) {
        Collection<Interval> intervals = new ArrayList<>();
        List<ExamStartingHour> startingHours = room.getExamStartingHours();
        if (startingHours.isEmpty()) {
            // Default to 1 hour slots that start at the hour
            startingHours = createDefaultStartingHours(room.getLocalTimezone());
        }
        Collections.sort(startingHours);
        DateTime now = DateTime.now().plusMillis(DateTimeZone.forID(room.getLocalTimezone()).getOffset(DateTime.now()));
        for (ExamRoom.OpeningHours oh : openingHours) {
            int tzOffset = oh.getTimezoneOffset();
            DateTime instant = now.getDayOfYear() == date.getDayOfYear() ? now : oh.getHours().getStart();
            DateTime slotEnd = oh.getHours().getEnd();
            DateTime beginning = nextStartingTime(instant, startingHours, tzOffset);
            while (beginning != null) {
                DateTime nextBeginning = nextStartingTime(beginning.plusMillis(1), startingHours, tzOffset);
                if (beginning.isBefore(oh.getHours().getStart())) {
                    beginning = nextBeginning;
                    continue;
                }
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

    private boolean isReservedByOthersDuring(ExamMachine machine, Interval interval, User user) {
        return machine.getReservations()
                .stream()
                .filter(r -> !r.getUser().equals(user))
                .anyMatch(r -> interval.overlaps(r.toInterval()));
    }

    private static List<Reservation> getReservationsDuring(Collection<Reservation> reservations, Interval interval) {
        return reservations.stream().filter(r -> interval.overlaps(r.toInterval())).collect(Collectors.toList());
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
            if (!machine.hasRequiredSoftware(exam)) {
                it.remove();
            }
        }
        return candidates;
    }

    private static boolean isRoomAccessibilitySatisfied(ExamRoom room, Collection<Integer> wanted) {
        List<Accessibility> roomAccessibility = room.getAccessibility();
        return roomAccessibility.stream()
                .map(accessibility -> accessibility.getId().intValue())
                .collect(Collectors.toList())
                .containsAll(wanted);
    }

    // TODO: this room vs machine accessibility needs some UI work and rethinking.
    private static boolean isMachineAccessibilitySatisfied(ExamMachine machine, Collection<Integer> wanted) {
        if (machine.isAccessible()) { // this has it all :)
            return true;
        }
        // The following is always empty because no UI-support for adding
        List<Accessibility> machineAccessibility = machine.getAccessibility();
        return machineAccessibility.stream()
                .map(accessibility -> accessibility.getId().intValue())
                .collect(Collectors.toList())
                .containsAll(wanted);
    }

    private static DateTime nextStartingTime(DateTime instant, List<ExamStartingHour> startingHours, int offset) {
        for (ExamStartingHour esh : startingHours) {
            int timeMs = new LocalTime(esh.getStartingHour()).plusMillis(offset).getMillisOfDay();
            DateTime datetime = instant.withMillisOfDay(timeMs);
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
        DateTime ending = beginning.plusHours(LAST_HOUR);
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

    private static DateTime getEndOfOpeningHours(DateTime instant, List<ExamRoom.OpeningHours> openingHours) {
        for (ExamRoom.OpeningHours oh : openingHours) {
            if (oh.getHours().contains(instant.plusMillis(oh.getTimezoneOffset()))) {
                return oh.getHours().getEnd().minusMillis(oh.getTimezoneOffset());
            }
        }
        // should not occur, indicates programming error
        throw new RuntimeException("slot not contained within opening hours, recheck logic!");
    }

    // DTO aimed for clients
    private static class TimeSlot {
        private final String start;
        private final String end;
        private final int availableMachines;
        private final boolean ownReservation;
        private final String conflictingExam;

        TimeSlot(Interval interval, int machineCount, String exam) {
            start = ISODateTimeFormat.dateTime().print(interval.getStart());
            end = ISODateTimeFormat.dateTime().print(interval.getEnd());
            availableMachines = machineCount;
            ownReservation = machineCount < 0;
            conflictingExam = exam;
        }

        public String getStart() {
            return start;
        }

        public String getEnd() {
            return end;
        }

        public int getAvailableMachines() {
            return availableMachines;
        }

        public boolean isOwnReservation() {
            return ownReservation;
        }

        public String getConflictingExam() {
            return conflictingExam;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof TimeSlot)) return false;
            TimeSlot timeSlot = (TimeSlot) o;
            return new EqualsBuilder().append(start, timeSlot.start).append(end, timeSlot.end).build();
        }

        @Override
        public int hashCode() {
            return new HashCodeBuilder().append(start).append(end).build();
        }

    }

}
