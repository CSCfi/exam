package backend.impl;

import backend.controllers.SettingsController;
import backend.exceptions.NotFoundException;
import backend.models.Accessibility;
import backend.models.Exam;
import backend.models.ExamMachine;
import backend.models.ExamRoom;
import backend.models.ExamStartingHour;
import backend.models.Reservation;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.models.sections.ExamSection;
import backend.util.config.ConfigReader;
import io.ebean.Ebean;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.inject.Inject;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.LocalTime;
import org.joda.time.format.ISODateTimeFormat;
import play.libs.Json;
import play.mvc.Result;
import play.mvc.Results;

public class CalendarHandlerImpl implements CalendarHandler {
  private static final int LAST_HOUR = 23;

  @Inject
  private ConfigReader configReader;

  @Override
  public Result getSlots(User user, Exam exam, Long roomId, String day, Collection<Integer> aids) {
    ExamRoom room = Ebean.find(ExamRoom.class, roomId);
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
      List<Reservation> reservations = Ebean
        .find(Reservation.class)
        .fetch("enrolment.exam")
        .where()
        .eq("user", user)
        .gt("startAt", searchDate.toDate())
        .findList();
      // Resolve eligible machines based on software and accessibility requirements
      List<ExamMachine> machines = getEligibleMachines(room, aids, exam);
      LocalDate endOfSearch = getEndSearchDate(searchDate, new LocalDate(exam.getExamActiveEndDate()));
      while (!searchDate.isAfter(endOfSearch)) {
        Set<TimeSlot> timeSlots = getExamSlots(user, room, exam, searchDate, reservations, machines);
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
    LocalDate searchDate = reservation.getStartAt().toLocalDate();
    // users reservations starting from now
    List<Reservation> reservations = Ebean
      .find(Reservation.class)
      .fetch("enrolment.exam")
      .where()
      .eq("user", reservation.getUser())
      .gt("startAt", searchDate.toDate())
      .findList();
    // Resolve eligible machines based on software and accessibility requirements
    List<ExamMachine> machines = getEligibleMachines(
      reservation.getMachine().getRoom(),
      aids,
      reservation.getEnrolment().getExam()
    );
    Set<TimeSlot> slots = getExamSlots(
      reservation.getUser(),
      reservation.getMachine().getRoom(),
      reservation.getEnrolment().getExam(),
      searchDate,
      reservations,
      machines
    );
    return slots.stream().anyMatch(s -> s.getInterval().contains(reservation.toInterval()));
  }

  /**
   * Search date is the current date if searching for current week or earlier,
   * If searching for upcoming weeks, day of week is one.
   */
  @Override
  public LocalDate parseSearchDate(String day, Exam exam, ExamRoom room) throws NotFoundException {
    int windowSize = getReservationWindowSize();

    int offset = room != null
      ? DateTimeZone.forID(room.getLocalTimezone()).getOffset(DateTime.now())
      : configReader.getDefaultTimeZone().getOffset(DateTime.now());
    LocalDate now = DateTime.now().plusMillis(offset).toLocalDate();
    LocalDate reservationWindowDate = now.plusDays(windowSize);

    LocalDate examEndDate = new DateTime(exam.getExamActiveEndDate()).plusMillis(offset).toLocalDate();
    LocalDate searchEndDate = reservationWindowDate.isBefore(examEndDate) ? reservationWindowDate : examEndDate;
    LocalDate examStartDate = new DateTime(exam.getExamActiveStartDate()).plusMillis(offset).toLocalDate();
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

  @Override
  public List<ExamMachine> getEligibleMachines(ExamRoom room, Collection<Integer> access, Exam exam) {
    List<ExamMachine> candidates = Ebean
      .find(ExamMachine.class)
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
      .collect(Collectors.toList());
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
    for (ExamMachine machine : machines) {
      if (!machine.isReservedDuring(wantedTime)) {
        return Optional.of(machine);
      }
    }
    return Optional.empty();
  }

  @Override
  public Reservation createReservation(
    DateTime start,
    DateTime end,
    ExamMachine machine,
    User user,
    Collection<Long> sectionIds
  ) {
    Reservation reservation = new Reservation();
    reservation.setEndAt(end);
    reservation.setStartAt(start);
    reservation.setMachine(machine);
    reservation.setUser(user);

    // If this is due in less than a day, make sure we won't send a reminder
    if (start.minusDays(1).isBeforeNow()) {
      reservation.setReminderSent(true);
    }
    if (!sectionIds.isEmpty()) {
      Set<ExamSection> sections = Ebean.find(ExamSection.class).where().idIn(sectionIds).findSet();
      reservation.setOptionalSections(sections);
    }
    return reservation;
  }

  @Override
  public Collection<Interval> gatherSuitableSlots(ExamRoom room, LocalDate date, Integer examDuration) {
    Collection<Interval> examSlots = new ArrayList<>();
    // Resolve the opening hours for room and day
    List<ExamRoom.OpeningHours> openingHours = room.getWorkingHoursForDate(date);
    if (!openingHours.isEmpty()) {
      // Get suitable slots based on exam duration
      for (Interval slot : allSlots(openingHours, room, date)) {
        DateTime beginning = slot.getStart();
        DateTime openUntil = getEndOfOpeningHours(beginning, openingHours);
        if (!beginning.plusMinutes(examDuration).isAfter(openUntil)) {
          DateTime end = beginning.plusMinutes(examDuration);
          examSlots.add(new Interval(beginning, end));
        }
      }
    }
    return examSlots;
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
      int availableMachineCount;
      if (entry.getValue().isPresent()) {
        availableMachineCount = entry.getValue().get();
      } else {
        availableMachineCount =
          machines.stream().filter(m -> !isReservedByOthersDuring(m, slot, user)).collect(Collectors.toList()).size();
      }
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
    Collection<ExamMachine> machines
  ) {
    Integer examDuration = exam.getDuration();
    Collection<Interval> examSlots = gatherSuitableSlots(room, date, examDuration);
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
  private static Iterable<Interval> allSlots(
    Iterable<ExamRoom.OpeningHours> openingHours,
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

  @Override
  public int getReservationWindowSize() {
    String reservationWindow = SettingsController.getOrCreateSettings("reservation_window_size", null, null).getValue();
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

  // TODO: this room vs machine accessibility needs some UI work and rethinking.
  private static boolean isMachineAccessibilitySatisfied(ExamMachine machine, Collection<Integer> wanted) {
    if (machine.isAccessible()) { // this has it all :)
      return true;
    }
    // The following is always empty because no UI-support for adding
    List<Accessibility> machineAccessibility = machine.getAccessibilities();
    return machineAccessibility
      .stream()
      .map(accessibility -> accessibility.getId().intValue())
      .collect(Collectors.toList())
      .containsAll(wanted);
  }

  private static boolean isRoomAccessibilitySatisfied(ExamRoom room, Collection<Integer> wanted) {
    List<Accessibility> roomAccessibility = room.getAccessibilities();
    return roomAccessibility
      .stream()
      .map(accessibility -> accessibility.getId().intValue())
      .collect(Collectors.toList())
      .containsAll(wanted);
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
    return reservations.stream().filter(r -> interval.overlaps(r.toInterval())).collect(Collectors.toList());
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
}
