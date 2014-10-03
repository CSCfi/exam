package controllers;

import Exceptions.MalformedDataException;
import Exceptions.NotFoundException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import models.*;
import org.joda.time.*;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.libs.Json;
import play.mvc.Result;
import util.java.EmailComposer;

import java.sql.Timestamp;
import java.util.*;


//I am so sorry. Really.

public class CalendarController extends SitnetController {

    private static DateTimeFormatter dateTimeFormat = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm");
    private static final DateTimeFormatter dateFormat = DateTimeFormat.forPattern("dd.MM.yyyy");

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
            throw new NotFoundException(String.format("No reservation with id  {} for current user.", id));
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
    public static Result getRoomAccessibilityInfo(long id) throws MalformedDataException, NotFoundException {

        final List<Accessibility> accessibilities = Ebean.find(ExamRoom.class)
                .where()
                .eq("id", id).findUnique().getAccessibility();

        return ok(Json.toJson(accessibilities));
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
        reservation.setEndAt(new Timestamp(end.getMillis()));
        reservation.setStartAt(new Timestamp(start.getMillis()));
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

        if (wantedSoftware.isEmpty()) {
            for (ExamMachine machine : machines) {
                if (machine.isArchived() || machine.getOutOfService()) {
                    continue;
                }
                candidates.addAll(machines);
            }
        } else {
            for (ExamMachine machine : machines) {

                if (machine.isArchived() || machine.getOutOfService()) {
                    continue;
                }

                List<Software> machineSoftware = machine.getSoftwareInfo();
                for (Software wanted : wantedSoftware) {
                    for (Software software : machineSoftware) {
                        if (wanted.getId().equals(software.getId())) {
                            candidates.add(machine);
                        }
                    }
                }
            }
        }

        if (candidates.isEmpty()) {
            return null;
        }
        Interval wantedTime = new Interval(start, end);
        for (ExamMachine machine : candidates) {
            boolean overlaps = false;
            for (Reservation reservation : machine.getReservation()) {
                Interval reservationInterval = new Interval(reservation.getStartAt().getTime(), reservation.getEndAt().getTime());
                if (reservationInterval.overlaps(wantedTime)) {
                    overlaps = true;
                }
                continue;
            }
            if (!overlaps) {
                return machine;
            }
        }
        return null;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getSlotsWithOutAccessibility(String examinput, String roominput, String dateinput) throws MalformedDataException, NotFoundException {
        return getSlots(examinput, roominput, dateinput, null);
    }


    private static DateTime getNow() {
        return DateTime.now().plus(DateTimeZone.forID("Europe/Helsinki").getOffset(DateTime.now()));
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getSlots(String examinput, String roominput, String dateinput, String accessibilityIds) throws NotFoundException {

        final ArrayList<Integer> wantedAccessibility = new ArrayList<>();
        if (accessibilityIds != null) {
            final List<String> strings = Arrays.asList(accessibilityIds.split(","));
            for (String id : strings) {
                wantedAccessibility.add(Integer.parseInt(id));
            }
        }

        final Long selectedExamId = Long.parseLong(examinput);
        final Long examRoomId = Long.parseLong(roominput);
        final User user = UserController.getLoggedUser();
        ExamEnrolment examEnrolment = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where().eq("user", user)
                .where().eq("exam", Ebean.find(Exam.class, selectedExamId)).findUnique();

        if (examEnrolment == null) {
            throw new NotFoundException(String.format("Cannot find enrolment with user/exam id-combination (%s/%s)", selectedExamId, user.getId()));
        }

        ExamRoom room = Ebean.find(ExamRoom.class)
                .fetch("examMachines")
                .fetch("accessibility")
                .where()
                .eq("id", examRoomId)
                .eq("outOfService", false)
                        //todo: other restrictions for accessibility person
                .findUnique();

        if (room == null) {
            throw new NotFoundException(String.format("No room with id: (%s)", room.getId()));
        }

        Exam exam = examEnrolment.getExam();
        DateTime examEndDateTime = new DateTime(exam.getExamActiveEndDate());
        DateTime searchDate = LocalDate.parse(dateinput, dateFormat).toDateTime(LocalTime.now());

        if (searchDate.isAfter(examEndDateTime)) {
            throw new NotFoundException(String.format("Given date (%s) is after active exam(%s) date(%s)", searchDate, exam.getId(), examEndDateTime));
        }

        DateTime now = getNow();

        if (searchDate.isBefore(now)) {
            searchDate = now;
        }

        DateTime current = searchDate;
        Map<String, DayWithFreeTimes> allPossibleFreeTimeSlots = new HashMap<String, DayWithFreeTimes>();

        List<Reservation> reservations = Ebean.find(Reservation.class)
                .where()
                .eq("user", user)
                .gt("startAt", now)
                .findList();

        do {
            final Map<String, DayWithFreeTimes> slots = getSlots(room, exam, current, reservations, wantedAccessibility);
            current = current.plusDays(1);
            allPossibleFreeTimeSlots.putAll(slots);
        } while (current.minusDays(1).isBefore(examEndDateTime));

        return ok(Json.toJson(allPossibleFreeTimeSlots));
    }

    private static Map<String, DayWithFreeTimes> getSlots(ExamRoom room, Exam exam, DateTime forDay, List<Reservation> reservations, ArrayList<Integer> wantedAccessibility) {
        Map<String, DayWithFreeTimes> allPossibleFreeTimeSlots = new HashMap<String, DayWithFreeTimes>();

        final DateTime now = getNow();

        final DateTime examStartTime = new DateTime(exam.getExamActiveStartDate());

        if (examStartTime.isAfter(forDay)) {
            return allPossibleFreeTimeSlots;
        }

        boolean roomAccessibilitySatisfied = true;

        if (!wantedAccessibility.isEmpty()) {
            final List<Accessibility> roomAccessibility = room.getAccessibility();
            for (Integer wantedId : wantedAccessibility) {
                boolean notFound = true;
                for (Accessibility access : roomAccessibility) {
                    int id = access.getId().intValue();
                    if (id == wantedId) {
                        notFound = false;
                    }
                }
                if (notFound) {
                    roomAccessibilitySatisfied = false;
                }
            }
        }


        for (ExamMachine examMachine : room.getExamMachines()) {

            boolean machineAccessibilitySatisfied = true;

            if (!wantedAccessibility.isEmpty() && !roomAccessibilitySatisfied) {
                final List<Accessibility> examMachineAccessibility = examMachine.getAccessibility();
                for (Integer wantedId : wantedAccessibility) {
                    boolean notFound = true;
                    for (Accessibility access : examMachineAccessibility) {
                        int id = access.getId().intValue();
                        if (id == wantedId) {
                            notFound = false;
                        }
                    }
                    if (notFound) {
                        machineAccessibilitySatisfied = false;
                    }
                }
            }

            if (!machineAccessibilitySatisfied) {
                continue;
            }

            if (examMachine.getOutOfService()) {
                continue;
            }

            final List<WorkingHours> allHoursForDay = calculateWorkingHours(room, forDay.toLocalDate());

            for (WorkingHours hours : allHoursForDay) {

                final DateTime startTime;
                final DateTime endTime;

                if (forDay.toLocalDate().equals(now.toLocalDate())) {
                    startTime = getNow().plusHours(1).withMinuteOfHour(0);
                } else {
                    startTime = hours.getStart();
                }

                final DateTime examEnd = new DateTime(exam.getExamActiveEndDate());

                if (forDay.toLocalDate().equals(examEnd.toLocalDate())) {
                    endTime = examEnd;
                } else {
                    endTime = hours.getEnd();
                }

                if (endTime.isBefore(startTime)) {
                    continue;
                }

                final Duration machineOpenDuration = new Duration(startTime, endTime);

                final Integer examDuration;

                if (exam.getDuration() == null) {
                    continue;
                }

                examDuration = exam.getDuration();

                int transitionTime = 0;
                try {
                    transitionTime = Integer.parseInt(room.getTransitionTime());
                } catch (Throwable t) {
                }

                int timeForSingleExam = examDuration + transitionTime;

                int numberOfPossibleFreeSlots = (int) Math.floor(machineOpenDuration.getStandardMinutes() / timeForSingleExam);

                if (numberOfPossibleFreeSlots <= 0) {
                    continue;
                }

                final String theDay = dateFormat.print(startTime);

                final ArrayList<DayWithFreeTimes> possibleFreeSlots = new ArrayList<DayWithFreeTimes>(numberOfPossibleFreeSlots);

                final DayWithFreeTimes day = new DayWithFreeTimes();
                day.setDate(theDay);


                final int shift = examDuration + transitionTime;

                DateTime freeTimeSlotEndTime = startTime.plusMinutes(shift);
                FreeTimeSlot possibleTimeSlot = getFreeTimeSlot(room, examMachine, startTime, freeTimeSlotEndTime);
                day.getSlots().add(possibleTimeSlot);

                DateTime freeTimeSlotStartTime = startTime.withMinuteOfHour(0);

                while (freeTimeSlotStartTime.plusHours(1).plusMinutes(shift).isBefore(endTime)) {
                    freeTimeSlotStartTime = freeTimeSlotStartTime.plusHours(1);
                    possibleTimeSlot = getFreeTimeSlot(room, examMachine, freeTimeSlotStartTime, freeTimeSlotStartTime.plusMinutes(shift));
                    day.getSlots().add(possibleTimeSlot);
                }

                for (FreeTimeSlot possibleFreeTimeSlot : day.getSlots()) {


                    final Interval possibleFreeTimeSlotDuration = new Interval(dateTimeFormat.parseDateTime(possibleFreeTimeSlot.getStart()), dateTimeFormat.parseDateTime(possibleFreeTimeSlot.getEnd()));


                    //user reservations
                    if (!reservations.isEmpty()) {
                        for (Reservation reservation : reservations) {

                            final Interval reservationDuration = reservation.toInterval();
                            //remove if intersects
                            if (possibleFreeTimeSlotDuration.overlaps(reservationDuration)) {
                                possibleFreeSlots.remove(possibleFreeTimeSlot);
                            }
                        }

                    }

                    //reservations for machine
                    for (Reservation reservation : examMachine.getReservation()) {

                        final Interval reservationDuration = reservation.toInterval();

                        //remove if intersects
                        if (possibleFreeTimeSlotDuration.overlaps(reservationDuration)) {
                            possibleFreeSlots.remove(possibleFreeTimeSlot);
                        }
                    }
                }

                if (allPossibleFreeTimeSlots.get(theDay) == null) {
                    allPossibleFreeTimeSlots.put(theDay, day);
                }
            }
        }
        return allPossibleFreeTimeSlots;
    }

    private static FreeTimeSlot getFreeTimeSlot(ExamRoom room, ExamMachine examMachine, DateTime freeTimeSlotStartTime, DateTime freeTimeSlotEndTime) {
        FreeTimeSlot possibleTimeSlot = new FreeTimeSlot();
        possibleTimeSlot.setStart(dateTimeFormat.print(freeTimeSlotStartTime));
        possibleTimeSlot.setEnd(dateTimeFormat.print(freeTimeSlotEndTime));
        possibleTimeSlot.setTitle(examMachine.getName());
        possibleTimeSlot.setRoom(room.getId());
        possibleTimeSlot.setMachine(examMachine.getId());
        return possibleTimeSlot;
    }

    private static class WorkingHours {
        private DateTime start;
        private DateTime end;

        private DateTime getEnd() {
            return end;
        }

        private void setEnd(DateTime end) {
            this.end = end;
        }

        private DateTime getStart() {
            return start;
        }

        private void setStart(DateTime start) {
            this.start = start;
        }
    }


    private static List<WorkingHours> calculateWorkingHours(ExamRoom room, LocalDate date) {


        final List<Interval> roomWorkingHours = room.getWorkingHoursForDate(date);
        final List<WorkingHours> workingHoursList = new ArrayList<WorkingHours>();

        if (roomWorkingHours == null || roomWorkingHours.isEmpty()) {
            return workingHoursList;
        }

        for (Interval roomHours : roomWorkingHours) {
            WorkingHours hours = new WorkingHours();
            hours.setStart(roomHours.getStart());
            hours.setEnd(roomHours.getEnd());
            workingHoursList.add(hours);
        }

        return workingHoursList;
    }
}
