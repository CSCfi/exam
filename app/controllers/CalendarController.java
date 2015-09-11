package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import exceptions.NotFoundException;
import models.*;
import models.api.CountsAsTrial;
import org.joda.time.*;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import system.ReservationPoller;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;


public class CalendarController extends BaseController {

    private static final DateTimeFormatter dateFormat = DateTimeFormat.forPattern("dd.MM.yyyyZZ");
    private static DateTimeFormatter dateTimeFormat = DateTimeFormat.forPattern("dd.MM.yyyy HH:mmZZ");

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;


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
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            try {
                emailComposer.composeReservationCancellationNotification(enrolment.getUser(), reservation, "", isStudentUser, enrolment);
                Logger.info("Reservation cancellation confirmation email sent");
            } catch (IOException e) {
                Logger.error("Failed to send reservation confirmation email", e);
            }
        }, actor.dispatcher());
        return ok("removed");
    }

    private boolean isAllowedToParticipate(Long examId) {
        User user = getLoggedUser();
        ReservationPoller.handleNoShow(user, examId, emailComposer);
        Integer trialCount = Ebean.find(Exam.class, examId).getTrialCount();
        if (trialCount == null) {
            return true;
        }
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class).where()
                .eq("user", user)
                .eq("exam.parent.id", examId)
                .ne("exam.state", Exam.State.DELETED)
                .ne("reservation.retrialPermitted", true)
                .findList();
        List<ExamEnrolment> noShows = Ebean.find(ExamEnrolment.class).where()
                .eq("user", user)
                .eq("exam.id", examId)
                .eq("reservation.noShow", true)
                .ne("reservation.retrialPermitted", true)
                .findList();
        List<CountsAsTrial> trials = new ArrayList<>(participations);
        trials.addAll(noShows);
        // Sort by trial time desc
        Collections.sort(trials, (o1, o2) -> o1.getTrialTime().after(o2.getTrialTime()) ? -1 : 1);

        if (trials.size() >= trialCount) {
            List<CountsAsTrial> subset = trials.subList(0, trialCount);
            return subset.stream().anyMatch(CountsAsTrial::isProcessed);
        }
        return true;
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result createReservation() {
        // Parse request body
        JsonNode json = request().body().asJson();
        Long roomId = json.get("roomId").asLong();
        Long examId = json.get("examId").asLong();
        if (!isAllowedToParticipate(examId)) {
            return forbidden("sitnet_no_trials_left");
        }
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
        // no previous reservation or it's in the future
        // Removal not permitted if reservation is in the past or if exam is already started
        Reservation oldReservation = enrolment.getReservation();
        if (enrolment.getExam().getState() == Exam.State.STUDENT_STARTED ||
                (oldReservation != null && oldReservation.toInterval().isBefore(DateTime.now()))) {
            return forbidden("sitnet_reservation_in_effect");
        }

        ExamMachine machine = getRandomMachine(room, enrolment.getExam(), start, end, aids);
        if (machine == null) {
            return forbidden("sitnet_no_machines_available");
        }

        final Reservation reservation = new Reservation();
        reservation.setEndAt(end.toDate());
        reservation.setStartAt(start.toDate());
        reservation.setMachine(machine);
        reservation.setUser(user);

        Ebean.save(reservation);
        enrolment.setReservation(reservation);
        enrolment.setReservationCanceled(false);
        Ebean.save(enrolment);

        if (oldReservation != null) {
            Ebean.delete(oldReservation);
        }
        Exam exam = enrolment.getExam();
        Set<User> recipients = new HashSet<>();
        if (exam.isPrivate()) {
            recipients.addAll(exam.getExamOwners());
            recipients.addAll(exam.getExamInspections().stream().map(
                    ExamInspection::getUser).collect(Collectors.toSet()));
        }
        recipients.add(user);

        // Send asynchronously
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            for (User recipient : recipients) {
                try {
                    emailComposer.composeReservationNotification(recipient, reservation, exam);
                    Logger.info("Reservation confirmation email sent");
                } catch (IOException e) {
                    Logger.error("Failed to send reservation confirmation email", e);
                }
            }
        }, actor.dispatcher());

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

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result getSlots(Long examId, Long roomId, String day, List<Integer> aids) {
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
                return notFound();
            }
            // users reservations starting from now
            List<Reservation> reservations = Ebean.find(Reservation.class)
                    .where()
                    .eq("user", getLoggedUser())
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
            DateTime openUntil = getEndOfOpeningHours(beginning, openingHours);
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
        LocalDate now = LocalDate.now();
        LocalDate searchDate = day.equals("") ? now : LocalDate.parse(day, dateFormat);
        searchDate = searchDate.withDayOfMonth(1);
        if (searchDate.isBefore(now)) {
            searchDate = now;
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

    private Exam getEnrolledExam(Long examId) {
        User user = getLoggedUser();
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

    private static boolean hasRequiredSoftware(ExamMachine machine, Exam exam) {
        return machine.getSoftwareInfo().containsAll(exam.getSoftwareInfo());
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

    private static DateTime getEndOfOpeningHours(DateTime instant, List<ExamRoom.OpeningHours> openingHours) {
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