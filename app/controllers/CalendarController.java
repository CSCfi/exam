package controllers;

import Exceptions.MalformedDataException;
import Exceptions.NotFoundException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import models.*;
import org.joda.time.DateTime;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.LocalTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.libs.Json;
import play.mvc.Result;
import util.java.EmailComposer;

import java.util.*;


public class CalendarController extends SitnetController {

    private static final DateTimeFormatter dateFormat = DateTimeFormat.forPattern("dd.MM.yyyyZZ");
    private static DateTimeFormatter dateTimeFormat = DateTimeFormat.forPattern("dd.MM.yyyy HH:mmZZ");


    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public static Result removeReservation(long id) throws MalformedDataException, NotFoundException {
        //todo: email trigger: remove reservation
        final User user = UserController.getLoggedUser();
        final ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .where()
                .eq("user.id", user.getId())
                .eq("reservation.id", id)
                .findUnique();
        if (enrolment == null) {
            throw new NotFoundException(String.format("No reservation with id %d for current user.", id));
        }

        Reservation reservation = enrolment.getReservation();

        // if user who removes reservation is not Student himself, send email
        if (!user.getId().equals(enrolment.getUser().getId())) {
            EmailComposer.composeReservationCancelationNotification(user, reservation, "");
        }

        enrolment.setReservation(null);
        Ebean.save(enrolment);
        Ebean.delete(Reservation.class, id);

        return ok("removed");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result createReservation() throws MalformedDataException {

        JsonNode json = request().body().asJson();

        //todo: add more validation, user can make loooon reservations eg.
        //todo: requirements?
        final Integer roomId = json.get("room").asInt();
        final Integer exam = json.get("exam").asInt();
        final DateTime start = DateTime.parse(json.get("start").asText(), dateTimeFormat);
        final DateTime end = DateTime.parse(json.get("end").asText(), dateTimeFormat);

        final User user = UserController.getLoggedUser();

        final ExamRoom room = Ebean.find(ExamRoom.class)
                .fetch("examMachines")
                .fetch("examMachines.reservation")
                .fetch("examMachines.softwareInfo")
                .where()
                .eq("id", roomId)
                .findUnique();

        final ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("exam.softwares")
                .where()
                .eq("user.id", user.getId())
                .eq("exam.id", exam)
                .findUnique();

        ExamMachine machine = getRandomMachine(room, enrolment.getExam(), start, end);

        if (machine == null) {
            return notFound();
        }

        final Reservation reservation = new Reservation();
        reservation.setEndAt(new Date(end.getMillis()));
        reservation.setStartAt(new Date(start.getMillis()));
        reservation.setMachine(machine);
        reservation.setUser(user);

        final Reservation oldReservation = enrolment.getReservation();

        Ebean.save(reservation);
        enrolment.setReservation(reservation);
        Ebean.save(enrolment);

        if (oldReservation != null) {
            Ebean.delete(oldReservation);
        }

        try {
            EmailComposer.composeReservationNotification(user, reservation, enrolment.getExam());
        } catch (Exception ex) {
            ex.printStackTrace();
        }

        return ok("ok");
    }

    private static ExamMachine getRandomMachine(ExamRoom room, Exam exam, DateTime start, DateTime end) {
        List<Software> wantedSoftware = exam.getSoftwareInfo();
        final List<ExamMachine> machines = room.getExamMachines();
        Collections.shuffle(machines);
        List<ExamMachine> candidates = new ArrayList<>();
        for (ExamMachine machine : machines) {
            if (machine.isArchived() || machine.getOutOfService()) {
                continue;
            }
            List<Software> machineSoftware = machine.getSoftwareInfo();
            if (machineSoftware.containsAll(wantedSoftware)) {
                candidates.add(machine);
            }
            candidates.add(machine);
        }
        Interval wantedTime = new Interval(start, end);
        for (ExamMachine machine : candidates) {
            boolean overlaps = false;
            for (Reservation reservation : machine.getReservations()) {
                Interval reservationInterval = new Interval(reservation.getStartAt().getTime(), reservation.getEndAt().getTime());
                if (reservationInterval.overlaps(wantedTime)) {
                    overlaps = true;
                }
            }
            if (!overlaps) {
                return machine;
            }
        }
        return null;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getSlots(Long examId, Long roomId, String day, List<Integer> aids) throws NotFoundException {
        Exam exam = getEnrolledExam(examId);
        if (exam == null) {
            throw new NotFoundException(String.format("Cannot find an enrolment"));
        }
        ExamRoom room = Ebean.find(ExamRoom.class, roomId);
        if (room == null) {
            throw new NotFoundException(String.format("No room with id: (%d)", roomId));
        }
        Map<String, List<FreeTimeSlot>> slots = new HashMap<>();
        if (!room.getOutOfService() && isRoomAccessibilitySatisfied(room, aids) && exam.getDuration() != null) {
            DateTime searchDate = parseSearchDate(day, exam);
            // users reservations starting from now
            List<Reservation> reservations = Ebean.find(Reservation.class)
                    .where()
                    .eq("user", UserController.getLoggedUser())
                    .gt("startAt", searchDate.toDate())
                    .findList();
            // Resolve eligible machines based on software and accessibility requirements
            List<ExamMachine> machines = getEligibleMachines(room, aids, exam);
            DateTime endOfSearch = getEndSearchDate(exam, searchDate);
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
    private static List<FreeTimeSlot> getFreeTimes(ExamRoom room, Exam exam, DateTime forDay,
            List<Reservation> reservations, List<ExamMachine> machines) {

        // Resolve the opening hours for room and day
        List<Interval> openingHours = room.getWorkingHoursForDate(forDay.toLocalDate());
        // Check machine availability for each slot
        List<Interval> eligibleSlots = new ArrayList<>();
        for (Interval slot : allSlots(openingHours)) {
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
        List<FreeTimeSlot> freeTimes = new ArrayList<>();
        Integer examDuration = exam.getDuration();
        for (Interval slot : mergeSlots(eligibleSlots)) {
            DateTime beginning = slot.getStart();
            while (!beginning.plusMinutes(examDuration).isAfter(slot.getEnd())) {
                DateTime end = beginning.plusMinutes(examDuration);
                freeTimes.add(new FreeTimeSlot(new Interval(beginning, end)));
                beginning = beginning.plusHours(1);
            }
        }
        return freeTimes;
    }

    // HELPERS -->

    /**
     * Search date is the current date if searching for current month or earlier,
     * If searching for upcoming months, day of month is one.
     */
    private static DateTime parseSearchDate(String day, Exam exam) throws NotFoundException {
        DateTime examEndDateTime = new DateTime(exam.getExamActiveEndDate());
        DateTime examStartDateTime = new DateTime(exam.getExamActiveStartDate());
        DateTime searchDate = day.equals("") ? DateTime.now() : LocalDate.parse(day, dateFormat).toDateTime(LocalTime.now());
        searchDate = searchDate.withDayOfMonth(1);
        if (searchDate.isBeforeNow()) {
            searchDate = DateTime.now();
        }
        // if searching for months after exam's end month -> no can do
        if (searchDate.isAfter(examEndDateTime)) {
            throw new NotFoundException(String.format("Given date (%s) is after active exam(%s) ending month (%s)", searchDate, exam.getId(), examEndDateTime));
        }
        // Do not execute search before exam starts
        if (searchDate.isBefore(examStartDateTime)) {
            searchDate = examStartDateTime;
        }
        return searchDate;
    }

    /**
     * @return which one is sooner, exam period's end or month's end
     */
    private static DateTime getEndSearchDate(Exam exam, DateTime searchDate) {
        DateTime endOfMonth = searchDate.dayOfMonth().withMaximumValue();
        DateTime examEnd = new DateTime(exam.getExamActiveEndDate());
        return endOfMonth.isBefore(examEnd) ? endOfMonth : examEnd;
    }

    private static Exam getEnrolledExam(Long examId) {
        final User user = UserController.getLoggedUser();
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where()
                .eq("user", user)
                .eq("exam.id", examId)
                .findUnique();
        return enrolment == null ? null : enrolment.getExam();
    }

    /**
     * @return all intervals of one hour that fall within provided working hours
     */
    private static List<Interval> allSlots(List<Interval> openingHours) {
        List<Interval> intervals = new ArrayList<>();
        DateTime nextFullHour = nextFullHour(DateTime.now());
        for (Interval oh : openingHours) {
            DateTime rounded = nextFullHour(oh.getStart());
            DateTime beginning = rounded.isBefore(nextFullHour) ? nextFullHour : rounded;
            while (!beginning.plusHours(1).isAfter(oh.getEnd())) {
                DateTime end = beginning.plusHours(1);
                intervals.add(new Interval(beginning, end));
                beginning = end;
            }
            if (beginning.isBefore(oh.getEnd())) {
                // We have a slot of less than hour in the end, take it as well
                intervals.add(new Interval(beginning, oh.getEnd()));
            }
        }
        return intervals;
    }

    /**
     * Merge adjacent/overlapping intervals into one
     */
    private static List<Interval> mergeSlots(List<Interval> slots) {
        if (slots.size() <= 1) {
            return slots;
        }
        List<Interval> merged = new ArrayList<>();
        for (int i = 0; i < slots.size(); ) {
            Interval first = slots.get(i);
            Interval adjacent = first;
            for (int j = i + 1; j < slots.size(); ++j) {
                Interval second = slots.get(j);
                if (!second.getStart().isAfter(adjacent.getEnd())) {
                    adjacent = second;
                } else {
                    break;
                }
            }
            i = slots.indexOf(adjacent) + 1;
            merged.add(new Interval(first.getStart(), adjacent.getEnd()));
        }
        return merged;
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

    private static boolean isMachineAccessibilitySatisfied(ExamMachine machine, Collection<Integer> wanted) {
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

    private static DateTime nextFullHour(DateTime datetime) {
        return datetime.plusHours(1).withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0);
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