package impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import controllers.SettingsController;
import controllers.iop.transfer.api.ExternalReservationHandler;
import exceptions.NotFoundException;
import io.ebean.DB;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import models.Exam;
import models.ExamEnrolment;
import models.ExamMachine;
import models.ExamRoom;
import models.ExamStartingHour;
import models.MailAddress;
import models.Reservation;
import models.User;
import models.calendar.MaintenancePeriod;
import models.iop.ExternalReservation;
import models.json.CollaborativeExam;
import models.sections.ExamSection;
import org.apache.pekko.actor.ActorSystem;
import org.joda.time.DateTime;
import org.joda.time.DateTimeConstants;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.LocalTime;
import org.joda.time.format.DateTimeFormatter;
import org.joda.time.format.ISODateTimeFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.Json;
import play.mvc.Result;
import play.mvc.Results;
import scala.concurrent.duration.Duration;
import util.config.ConfigReader;
import util.datetime.DateTimeHandler;

public class CalendarHandlerImpl implements CalendarHandler {

    private final Logger logger = LoggerFactory.getLogger(CalendarHandlerImpl.class);
    private static final int LAST_HOUR = 23;

    @Inject
    private ConfigReader configReader;

    @Inject
    private ExternalReservationHandler externalReservationHandler;

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem system;

    @Inject
    protected DateTimeHandler dateTimeHandler;

    @Override
    public Result getSlots(User user, Exam exam, Long roomId, String day, Collection<Integer> aids) {
        ExamRoom room = DB.find(ExamRoom.class, roomId);
        if (room == null) {
            return Results.forbidden(String.format("No room with id: (%d)", roomId));
        }
        Collection<TimeSlot> slots = new ArrayList<>();
        if (
            !room.getOutOfService() &&
            !room.getState().equals(ExamRoom.State.INACTIVE.toString()) &&
            isRoomAccessibilitySatisfied(room, aids) &&
            exam.getDuration() != null
        ) {
            LocalDate searchDate;
            try {
                searchDate = parseSearchDate(day, exam, room);
            } catch (NotFoundException e) {
                return Results.notFound();
            }
            // users reservations starting from now
            List<Reservation> reservations = DB.find(Reservation.class)
                .fetch("enrolment.exam")
                .where()
                .eq("user", user)
                .gt("startAt", searchDate.minusDays(1).toDate())
                .findList();
            // Resolve eligible machines based on software and accessibility requirements
            List<ExamMachine> machines = getEligibleMachines(room, aids, exam);
            // Maintenance periods
            List<Interval> periods = DB.find(MaintenancePeriod.class)
                .where()
                .gt("endsAt", searchDate.toDate())
                .findList()
                .stream()
                .map(
                    p ->
                        new Interval(normalizeMaintenanceTime(p.getStartsAt()), normalizeMaintenanceTime(p.getEndsAt()))
                )
                .toList();
            LocalDate endOfSearch = getEndSearchDate(searchDate, new LocalDate(exam.getPeriodEnd()));
            while (!searchDate.isAfter(endOfSearch)) {
                Set<TimeSlot> timeSlots = getExamSlots(user, room, exam, searchDate, reservations, machines, periods);
                if (!timeSlots.isEmpty()) {
                    slots.addAll(timeSlots);
                }
                searchDate = searchDate.plusDays(1);
            }
        }
        return Results.ok(Json.toJson(slots));
    }

    @Override
    public boolean isDoable(Reservation reservation, Collection<Integer> aids) {
        DateTimeZone dtz = DateTimeZone.forID(reservation.getMachine().getRoom().getLocalTimezone());
        LocalDate searchDate = dateTimeHandler.normalize(reservation.getStartAt().withZone(dtz), dtz).toLocalDate();
        // users reservations starting from now
        List<Reservation> reservations = DB.find(Reservation.class)
            .fetch("enrolment.exam")
            .where()
            .eq("user", reservation.getUser())
            .ge("startAt", searchDate.toDate())
            .findList();
        // Resolve eligible machines based on software and accessibility requirements
        List<ExamMachine> machines = getEligibleMachines(
            reservation.getMachine().getRoom(),
            aids,
            reservation.getEnrolment().getExam()
        );
        // Maintenance periods
        List<Interval> periods = DB.find(MaintenancePeriod.class)
            .where()
            .gt("endsAt", searchDate.toDate())
            .findList()
            .stream()
            .map(p -> new Interval(normalizeMaintenanceTime(p.getStartsAt()), normalizeMaintenanceTime(p.getEndsAt())))
            .toList();
        Set<TimeSlot> slots = getExamSlots(
            reservation.getUser(),
            reservation.getMachine().getRoom(),
            reservation.getEnrolment().getExam(),
            searchDate,
            reservations,
            machines,
            periods
        );
        return slots.stream().anyMatch(s -> s.interval.contains(reservation.toInterval()));
    }

    /**
     * Search date is the current date if searching for current week or earlier,
     * If searching for upcoming weeks, day of week is one.
     */
    @Override
    public LocalDate parseSearchDate(String day, Exam exam, ExamRoom room) throws NotFoundException {
        int windowSize = getReservationWindowSize();
        DateTimeZone dtz = room != null
            ? DateTimeZone.forID(room.getLocalTimezone())
            : configReader.getDefaultTimeZone();
        int startOffset = dtz.getOffset((exam.getPeriodStart()));
        int offset = dtz.getOffset(DateTime.now());
        LocalDate now = DateTime.now().plusMillis(offset).toLocalDate();
        LocalDate reservationWindowDate = now.plusDays(windowSize);

        LocalDate examEndDate = new DateTime(exam.getPeriodEnd()).plusMillis(offset).toLocalDate();
        LocalDate searchEndDate = reservationWindowDate.isBefore(examEndDate) ? reservationWindowDate : examEndDate;
        LocalDate examStartDate = new DateTime(exam.getPeriodStart()).plusMillis(startOffset).toLocalDate();
        LocalDate searchDate = day.equals("") ? now : ISODateTimeFormat.dateTimeParser().parseLocalDate(day);
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

    private List<ExamMachine> getEligibleMachines(ExamRoom room, Collection<Integer> access, Exam exam) {
        List<ExamMachine> candidates = DB.find(ExamMachine.class)
            .fetch("room")
            .where()
            .eq("room.id", room.getId())
            .ne("outOfService", true)
            .ne("archived", true)
            .isNotNull("ipAddress")
            .isNotNull("name")
            .findList();
        return candidates
            .stream()
            .filter(em -> isMachineAccessibilitySatisfied(em, access) && (exam == null || em.hasRequiredSoftware(exam)))
            .collect(Collectors.toList()); // needs to be a mutable collection (for shuffling)
    }

    @Override
    public Optional<ExamMachine> getRandomMachine(
        ExamRoom room,
        Exam exam,
        DateTime start,
        DateTime end,
        Collection<Integer> aids
    ) {
        List<ExamMachine> machines = getEligibleMachines(room, aids, exam);
        Collections.shuffle(machines);
        Interval wantedTime = new Interval(start, end);
        return machines.stream().filter(m -> !m.isReservedDuring(wantedTime)).findFirst();
    }

    @Override
    public Reservation createReservation(DateTime start, DateTime end, ExamMachine machine, User user) {
        Reservation reservation = new Reservation();
        reservation.setEndAt(end);
        reservation.setStartAt(start);
        reservation.setMachine(machine);
        reservation.setUser(user);

        // If this is due in less than a day, make sure we won't send a reminder
        if (start.minusDays(1).isBeforeNow()) {
            reservation.setReminderSent(true);
        }

        return reservation;
    }

    @Override
    public Collection<Interval> gatherSuitableSlots(ExamRoom room, LocalDate date, Integer examDuration) {
        // Resolve the opening hours for room and day
        List<DateTimeHandler.OpeningHours> openingHours = dateTimeHandler.getWorkingHoursForDate(date, room);
        if (!openingHours.isEmpty()) {
            // Get suitable slots based on exam duration
            return allSlots(openingHours, room, date)
                .stream()
                .filter(slot -> {
                    DateTime beginning = slot.getStart();
                    DateTime openUntil = getEndOfOpeningHours(beginning, openingHours);
                    return !beginning.plusMinutes(examDuration).isAfter(openUntil);
                })
                .map(slot -> new Interval(slot.getStart(), slot.getStart().plusMinutes(examDuration)))
                .toList();
        }
        return Collections.emptyList();
    }

    private boolean isReservationForExam(Reservation r, Exam e) {
        Exam exam = r.getEnrolment().getExam();
        if (exam != null) {
            return exam.equals(e);
        }
        CollaborativeExam ce = r.getEnrolment().getCollaborativeExam();
        if (ce != null) {
            return ce.getHash().equals(e.getHash());
        }
        return false;
    }

    // Go through the slots and check if conflicting reservations exist. Decorate such slots with conflict information.
    // Available machine count can be either pre-calculated (in which case the amount comes in form of map value) or not
    // (in which case the calculation is done based on machines provided).
    @Override
    public Set<TimeSlot> handleReservations(
        Map<Interval, Optional<Integer>> examSlots,
        Collection<Reservation> reservations,
        Exam exam,
        Collection<ExamMachine> machines,
        User user
    ) {
        Set<TimeSlot> results = new LinkedHashSet<>();
        for (Map.Entry<Interval, Optional<Integer>> entry : examSlots.entrySet()) {
            Interval slot = entry.getKey();
            List<Reservation> conflicting = getReservationsDuring(reservations, slot);
            if (!conflicting.isEmpty()) {
                Optional<Reservation> concernsAnotherExam = conflicting
                    .stream()
                    .filter(c -> !isReservationForExam(c, exam))
                    .findFirst();
                if (concernsAnotherExam.isPresent()) {
                    // User has a reservation to another exam, do not allow making overlapping reservations
                    Reservation reservation = concernsAnotherExam.get();
                    String conflictingExam = reservation.getEnrolment().getExam() != null
                        ? reservation.getEnrolment().getExam().getName()
                        : reservation.getEnrolment().getCollaborativeExam().getName();
                    results.add(new TimeSlot(reservation.toInterval(), -1, conflictingExam));
                    continue;
                } else {
                    // User has an existing reservation to this exam
                    Reservation reservation = conflicting.get(0);
                    if (!reservation.toInterval().equals(slot)) {
                        // No matching slot found in this room, add the reservation as-is.
                        results.add(new TimeSlot(reservation.toInterval(), -1, null));
                    } else {
                        // This is exactly the same slot, avoid duplicates and continue.
                        results.add(new TimeSlot(slot, -1, null));
                        continue;
                    }
                }
            }
            // Resolve available machine count. Assume precalculated values within the map if no machines provided
            int availableMachineCount = entry.getValue().isPresent()
                ? entry.getValue().get()
                : (int) machines.stream().filter(m -> !isReservedByOthersDuring(m, slot, user)).count();

            results.add(new TimeSlot(slot, availableMachineCount, null));
        }
        return results;
    }

    /**
     * Queries for slots for given room and day
     */
    private Set<TimeSlot> getExamSlots(
        User user,
        ExamRoom room,
        Exam exam,
        LocalDate date,
        Collection<Reservation> reservations,
        Collection<ExamMachine> machines,
        Collection<Interval> maintenancePeriods
    ) {
        Integer examDuration = exam.getDuration();
        Collection<Interval> examSlots = gatherSuitableSlots(room, date, examDuration)
            .stream()
            .filter(slot -> maintenancePeriods.stream().noneMatch(p -> p.overlaps(slot)))
            .toList();
        Map<Interval, Optional<Integer>> map = examSlots
            .stream()
            .collect(
                Collectors.toMap(
                    Function.identity(),
                    es -> Optional.empty(),
                    (u, v) -> {
                        throw new IllegalStateException(String.format("Duplicate key %s", u));
                    },
                    LinkedHashMap::new
                )
            );
        // Check reservation status and machine availability for each slot
        return handleReservations(map, reservations, exam, machines, user);
    }

    /**
     * @return all intervals that fall within provided working hours
     */
    private static Collection<Interval> allSlots(
        Iterable<DateTimeHandler.OpeningHours> openingHours,
        ExamRoom room,
        LocalDate date
    ) {
        Collection<Interval> intervals = new ArrayList<>();
        List<ExamStartingHour> startingHours = room.getExamStartingHours();
        if (startingHours.isEmpty()) {
            // Default to 1 hour slots that start at the hour
            startingHours = createDefaultStartingHours(room.getLocalTimezone());
        }
        Collections.sort(startingHours);
        DateTime now = DateTime.now().plusMillis(DateTimeZone.forID(room.getLocalTimezone()).getOffset(DateTime.now()));
        for (DateTimeHandler.OpeningHours oh : openingHours) {
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

    @Override
    public int getReservationWindowSize() {
        String reservationWindow = SettingsController.getOrCreateSettings(
            "reservation_window_size",
            null,
            null
        ).getValue();
        return reservationWindow != null ? Integer.parseInt(reservationWindow) : 0;
    }

    /**
     * @return which one is sooner, exam period's end or week's end
     */
    @Override
    public LocalDate getEndSearchDate(LocalDate searchDate, LocalDate examEnd) {
        LocalDate endOfWeek = searchDate.dayOfWeek().withMaximumValue();
        LocalDate reservationWindowDate = LocalDate.now().plusDays(getReservationWindowSize());
        LocalDate endOfSearchDate = examEnd.isBefore(reservationWindowDate) ? examEnd : reservationWindowDate;
        return endOfWeek.isBefore(endOfSearchDate) ? endOfWeek : endOfSearchDate;
    }

    @Override
    public Set<CalendarHandler.TimeSlot> postProcessSlots(JsonNode node, String date, Exam exam, User user) {
        // Filter out slots that user has a conflicting reservation with
        if (node.isArray()) {
            ArrayNode root = (ArrayNode) node;
            LocalDate searchDate = LocalDate.parse(date, ISODateTimeFormat.dateParser());
            // users reservations starting from now
            List<Reservation> reservations = DB.find(Reservation.class)
                .fetch("enrolment.exam")
                .where()
                .eq("user", user)
                .gt("startAt", searchDate.toDate())
                .findList();
            DateTimeFormatter dtf = ISODateTimeFormat.dateTimeParser();
            Stream<JsonNode> stream = StreamSupport.stream(root.spliterator(), false);
            Map<Interval, Optional<Integer>> map = stream.collect(
                Collectors.toMap(
                    n -> {
                        DateTime start = dtf.parseDateTime(n.get("start").asText());
                        DateTime end = dtf.parseDateTime(n.get("end").asText());
                        return new Interval(start, end);
                    },
                    n -> Optional.of(n.get("availableMachines").asInt()),
                    (u, v) -> {
                        throw new IllegalStateException(String.format("Duplicate key %s", u));
                    },
                    LinkedHashMap::new
                )
            );
            List<Interval> periods = DB.find(MaintenancePeriod.class)
                .where()
                .ge("endsAt", searchDate.withDayOfWeek(DateTimeConstants.MONDAY).toDate())
                .findList()
                .stream()
                .map(
                    p ->
                        new Interval(normalizeMaintenanceTime(p.getStartsAt()), normalizeMaintenanceTime(p.getEndsAt()))
                )
                .toList();
            // Filter out slots that overlap a local maintenance period
            Map<Interval, Optional<Integer>> map2 = map
                .entrySet()
                .stream()
                .filter(e -> periods.stream().noneMatch(m -> m.overlaps(e.getKey())))
                .collect(
                    Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (u, v) -> {
                            throw new IllegalStateException(String.format("Duplicate key %s", u));
                        },
                        LinkedHashMap::new
                    )
                );
            return handleReservations(map2, reservations, exam, null, user);
        }
        return Collections.emptySet();
    }

    @Override
    public CompletionStage<Optional<Integer>> handleExternalReservation(
        ExamEnrolment enrolment,
        Exam exam,
        JsonNode node,
        DateTime start,
        DateTime end,
        User user,
        String orgRef,
        String roomRef,
        Collection<Long> sectionIds
    ) {
        Reservation oldReservation = enrolment.getReservation();
        Reservation reservation = new Reservation();
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
        external.setOrgName(node.path("orgName").asText());
        external.setOrgCode(node.path("orgCode").asText());
        JsonNode machineNode = node.get("machine");
        JsonNode roomNode = machineNode.get("room");
        external.setMachineName(machineNode.get("name").asText());
        external.setRoomName(roomNode.get("name").asText());
        external.setRoomCode(roomNode.get("roomCode").asText());
        external.setRoomTz(roomNode.get("localTimezone").asText());
        external.setRoomInstruction(roomNode.path("roomInstruction").asText(null));
        external.setRoomInstructionEN(roomNode.path("roomInstructionEN").asText(null));
        external.setRoomInstructionSV(roomNode.path("roomInstructionSV").asText(null));
        JsonNode addressNode = roomNode.path("mailAddress");
        if (addressNode.isObject()) {
            MailAddress mailAddress = new MailAddress();
            mailAddress.setStreet(addressNode.path("street").asText());
            mailAddress.setCity(addressNode.path("city").asText());
            mailAddress.setZip(addressNode.path("zip").asText());
            external.setMailAddress(mailAddress);
        }
        external.setBuildingName(roomNode.path("buildingName").asText());
        external.setCampus(roomNode.path("campus").asText());
        external.save();
        reservation.setExternalReservation(external);
        DB.save(reservation);
        enrolment.setReservation(reservation);
        enrolment.setReservationCanceled(false);
        Set<ExamSection> sections = sectionIds.isEmpty()
            ? Collections.emptySet()
            : DB.find(ExamSection.class).where().idIn(sectionIds).findSet();
        enrolment.getOptionalSections().clear();
        enrolment.update();
        enrolment.setOptionalSections(sections);
        DB.save(enrolment);

        // Finally nuke the old reservation if any
        if (oldReservation != null) {
            if (oldReservation.getExternalReservation() != null) {
                return externalReservationHandler
                    .removeExternalReservation(oldReservation)
                    .thenApply(err -> {
                        if (err.isEmpty()) {
                            DB.delete(oldReservation);
                            postProcessRemoval(reservation, exam, user, machineNode);
                        }
                        return err;
                    });
            } else {
                DB.delete(oldReservation);
                postProcessRemoval(reservation, exam, user, machineNode);
                return CompletableFuture.completedFuture(Optional.empty());
            }
        } else {
            postProcessRemoval(reservation, exam, user, machineNode);
            return CompletableFuture.completedFuture(Optional.empty());
        }
    }

    @Override
    public DateTime normalizeMaintenanceTime(DateTime dateTime) {
        DateTimeZone dtz = configReader.getDefaultTimeZone();
        return dtz.isStandardOffset(dateTime.getMillis()) ? dateTime : dateTime.plusHours(1);
    }

    private void postProcessRemoval(Reservation reservation, Exam exam, User user, JsonNode node) {
        // Attach the external machine data just so that email can be generated
        reservation.setMachine(parseExternalMachineData(node));
        // Send some emails asynchronously
        system
            .scheduler()
            .scheduleOnce(
                Duration.create(1, TimeUnit.SECONDS),
                () -> {
                    emailComposer.composeReservationNotification(user, reservation, exam, false);
                    logger.info("Reservation confirmation email sent to {}", user.getEmail());
                },
                system.dispatcher()
            );
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

    // TODO: this room vs machine accessibility needs some UI work and rethinking.
    private static boolean isMachineAccessibilitySatisfied(ExamMachine machine, Collection<Integer> wanted) {
        if (machine.isAccessible()) { // this has it all :)
            return true;
        }
        // The following is always empty because no UI-support for adding
        Set<Integer> machineAccessibility = machine
            .getAccessibilities()
            .stream()
            .map(accessibility -> accessibility.getId().intValue())
            .collect(Collectors.toSet());
        return machineAccessibility.containsAll(wanted);
    }

    private static boolean isRoomAccessibilitySatisfied(ExamRoom room, Collection<Integer> wanted) {
        Set<Integer> roomAccessibility = room
            .getAccessibilities()
            .stream()
            .map(accessibility -> accessibility.getId().intValue())
            .collect(Collectors.toSet());
        return roomAccessibility.containsAll(wanted);
    }

    private boolean isReservedByUser(Reservation reservation, User user) {
        boolean externallyReserved =
            reservation.getExternalUserRef() != null && reservation.getExternalRef().equals(user.getEppn());
        return (externallyReserved || (reservation.getUser() != null && reservation.getUser().equals(user)));
    }

    private boolean isReservedByOthersDuring(ExamMachine machine, Interval interval, User user) {
        return machine
            .getReservations()
            .stream()
            .filter(r -> !isReservedByUser(r, user))
            .anyMatch(r -> interval.overlaps(r.toInterval()));
    }

    private static List<Reservation> getReservationsDuring(Collection<Reservation> reservations, Interval interval) {
        return reservations.stream().filter(r -> interval.overlaps(r.toInterval())).toList();
    }

    private static DateTime nextStartingTime(DateTime instant, List<ExamStartingHour> startingHours, int offset) {
        return startingHours
            .stream()
            .map(sh -> {
                int timeMs = new LocalTime(sh.getStartingHour()).plusMillis(offset).getMillisOfDay();
                return instant.withMillisOfDay(timeMs);
            })
            .filter(dt -> !dt.isBefore(instant))
            .findFirst()
            .orElse(null);
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

    private static DateTime getEndOfOpeningHours(DateTime instant, List<DateTimeHandler.OpeningHours> openingHours) {
        return openingHours
            .stream()
            .filter(oh -> oh.getHours().contains(instant.plusMillis(oh.getTimezoneOffset())))
            .map(oh -> oh.getHours().getEnd().minusMillis(oh.getTimezoneOffset()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("slot not contained within opening hours, recheck logic!"));
    }
}
