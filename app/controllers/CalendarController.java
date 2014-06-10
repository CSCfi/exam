package controllers;

import Exceptions.MalformedDataException;
import com.avaje.ebean.Ebean;
import models.*;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import org.joda.time.*;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.libs.Json;
import play.mvc.Result;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;


//I am   so sorry. Really.

public class CalendarController extends SitnetController {

    private static DateTimeFormatter format = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm");
    private static final DateTimeFormatter dayFormat = DateTimeFormat.forPattern("dd.MM.yyyy");


    public static Result createReservation() throws MalformedDataException {

        FreeTimeSlot machine = bindForm(FreeTimeSlot.class);
        System.out.println(machine);
        return ok("ok");

    }

    public static Result getSlots(String examinput, String roominput, String dateinput) throws MalformedDataException {


        final Long selectedExamId = Long.parseLong(examinput);
        final Long examRoomId = Long.parseLong(roominput);
        //final User loggedUser = UserController.getLoggedUser();
        final Long userId = 3l; //loggedUser.getId();

        User user = Ebean.find(User.class, userId);//UserController.getLoggedUser();

        ExamEnrolment examEnrolment = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where().eq("user", user)
                .where().eq("exam", Ebean.find(Exam.class, selectedExamId)).findUnique();

        if (examEnrolment == null) {
            throw new MalformedDataException(String.format("Cannot find enrolment with user/exam id-combination (%s/%s)", selectedExamId, user.getId()));
        }

        ExamRoom room = Ebean.find(ExamRoom.class)
                .fetch("examMachines")
                .where().eq("id", examRoomId)
                        //todo: other restrictions for accessibility person
                .findUnique();

        if (room == null) {
            throw new MalformedDataException(String.format("No room with id: (%s)", room));
        }

        Exam exam = examEnrolment.getExam();
        DateTime examEndDateTime = new DateTime(exam.getExamActiveEndDate());
        DateTime searchDate = LocalDate.parse(dateinput, dayFormat).toDateTime(LocalTime.now());

        if (searchDate.isAfter(examEndDateTime)) {
            throw new MalformedDataException(String.format("Given date (%s) is after active exam(%s) date(%s)", searchDate, exam.getId(), examEndDateTime));
        }

        if (searchDate.isBeforeNow()) {
            searchDate = DateTime.now();
        }

        DateTime current = searchDate;
        Map<String, DayWithFreeTimes> allPossibleFreeTimeSlots = new HashMap<String, DayWithFreeTimes>();

        do {
            final Map<String, DayWithFreeTimes> slots = getSlots(room, exam, current);
            current = current.plusDays(1);
            allPossibleFreeTimeSlots.putAll(slots);
        } while (current.minusDays(1).isBefore(examEndDateTime));

        return ok(Json.toJson(allPossibleFreeTimeSlots));
    }


    private static Map<String, DayWithFreeTimes> getSlots(ExamRoom room, Exam exam, DateTime forDay) {
        Map<String, DayWithFreeTimes> allPossibleFreeTimeSlots = new HashMap<String, DayWithFreeTimes>();

        for (ExamMachine examMachine : room.getExamMachines()) {

            if (examMachine.getOutOfService()) {
                continue;
            }

            final WorkingHours hours = calculateWorkingHours(room, forDay);
            final DateTime startTime;
            final DateTime endTime;

            if(forDay.toLocalDate().equals(LocalDate.now())) {
                startTime = DateTime.now();
            } else {
                startTime = hours.getStart();
            }

            final DateTime examEnd = new DateTime(exam.getExamActiveEndDate());

            if(forDay.toLocalDate().equals(examEnd.toLocalDate())) {
                endTime = examEnd;
            } else {
                endTime = hours.getEnd();
            }

            if(endTime.isBefore(startTime)) {
                continue;
            }

            final Duration machineOpenDuration = new Duration(startTime, endTime);

            final Double examDuration;

            if(exam.getDuration() == null) {
                continue;
            }

            examDuration = exam.getDuration();

            int transitionTime = 0;
            try {
                transitionTime = Integer.parseInt(room.getTransitionTime());
            } catch (Throwable t) {
            }

            int timeForSingleExam = examDuration.intValue() + transitionTime;

            int numberOfPossibleFreeSlots = (int) Math.floor(machineOpenDuration.getStandardMinutes() / timeForSingleExam);

            if (numberOfPossibleFreeSlots <= 0) {
                continue;
            }

            final String theDay = dayFormat.print(startTime);

            final ArrayList<DayWithFreeTimes> possibleFreeSlots = new ArrayList<DayWithFreeTimes>(numberOfPossibleFreeSlots);

            final DayWithFreeTimes day = new DayWithFreeTimes();
            day.setDate(theDay);
            for (int i = 0; i <= (numberOfPossibleFreeSlots - 1); i++) {
                final int shift = examDuration.intValue() + transitionTime;
                DateTime freeTimeSlotStartTime = startTime.plusMinutes(i * shift);
                DateTime freeTimeSlotEndTime = freeTimeSlotStartTime.plusMinutes(shift);
                FreeTimeSlot possibleTimeSlot = new FreeTimeSlot();
                possibleTimeSlot.setStart(format.print(freeTimeSlotStartTime));
                possibleTimeSlot.setEnd(format.print(freeTimeSlotEndTime));
                possibleTimeSlot.setTitle(examMachine.getName());
                possibleTimeSlot.setRoom(room.getId());
                possibleTimeSlot.setMachine(examMachine.getId());
                day.getSlots().add(possibleTimeSlot);
            }

            for (FreeTimeSlot possibleFreeTimeSlot : day.getSlots()) {
                for (Reservation reservation : examMachine.getReservation()) {

                    final Interval reservationDuration = new Interval(reservation.getStartAt().getTime(), reservation.getEndAt().getTime());
                    final Interval possibleFreeTimeSlotDuration = new Interval(format.parseDateTime(possibleFreeTimeSlot.getStart()), format.parseDateTime(possibleFreeTimeSlot.getEnd()));

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
        return allPossibleFreeTimeSlots;
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

    private static WorkingHours calculateWorkingHours(ExamRoom room, DateTime date) {
        final DefaultWorkingHours roomWorkingHours = room.getCalendarEvent();
        final WorkingHours hours = new WorkingHours();
        for (ExceptionWorkingHours exception : room.getCalendarExceptionEvents()) {
            Interval exceptionDates = new Interval(new LocalDate(exception.getExceptionStartDate()).toDateMidnight(), new LocalDate(exception.getExceptionEndDate()).toDateMidnight());
            if (exceptionDates.contains(date.toDateMidnight())) {
                //ugh...
                LocalTime endTime = new LocalTime(exception.getExceptionEndTime().getTime());
                DateTime end = date.toLocalDate().toDateTime(endTime);
                LocalTime startTime = new LocalTime(exception.getExceptionStartTime().getTime());
                DateTime start = date.toLocalDate().toDateTime(startTime);
                hours.setEnd(end);
                hours.setStart(start);
                return hours;
            }
        }

        hours.setStart(date.toLocalDate().toDateTime(new LocalTime(roomWorkingHours.getStartTime())));
        hours.setEnd(date.toLocalDate().toDateTime(new LocalTime(roomWorkingHours.getEndTime())));

        return hours;
    }
}