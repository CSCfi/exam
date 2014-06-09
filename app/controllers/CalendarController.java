package controllers;

import Exceptions.MalformedDataException;
import com.avaje.ebean.Ebean;
import models.*;
import models.calendar.DefaultWorkingHours;
import org.joda.time.*;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.libs.Json;
import play.mvc.Result;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class CalendarController extends SitnetController {

    private static DateTimeFormatter format = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm");
    private static final DateTimeFormatter dayFormat = DateTimeFormat.forPattern("dd.MM.yyyy");


    public static Result createReservation() throws MalformedDataException {

        FreeTimeSlot machine = bindForm(FreeTimeSlot.class);
        System.out.println(machine);
        return ok("ok");

    }

    public static Result getSlots(String selectedExam, String examRoom, String inputDate) throws MalformedDataException {


        final Long selectedExamId = Long.parseLong(selectedExam);
        final Long examRoomId = Long.parseLong(examRoom);
        final User loggedUser = UserController.getLoggedUser();
        final Long userId = loggedUser.getId();

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
        DateTime searchDate = DateMidnight.parse(inputDate, dayFormat).toDateTime();

        if (searchDate.isAfter(examEndDateTime)) {
            throw new MalformedDataException(String.format("Given date (%s) is after active exam(%s) date(%s)", searchDate, exam.getId(), examEndDateTime));
        }

        Map<String, DayWithFreeTimes> allPossibleFreeTimeSlots = new HashMap<String, DayWithFreeTimes>();

        if (searchDate.isBeforeNow()) {
            searchDate = DateTime.now();
        }
        DateTime current = searchDate;

        final int max = current.dayOfMonth().withMaximumValue().getDayOfMonth();

        do {
            final Map<String, DayWithFreeTimes> slots = getSlots(room, exam, current);
            allPossibleFreeTimeSlots.putAll(slots);
            current = current.plusDays(1);
        } while (max == current.dayOfMonth().get() || current.isAfter(examEndDateTime));

        return ok(Json.toJson(allPossibleFreeTimeSlots));
    }


    private static Map<String, DayWithFreeTimes> getSlots(ExamRoom room, Exam exam, DateTime forDay) {
        Map<String, DayWithFreeTimes> allPossibleFreeTimeSlots = new HashMap<String, DayWithFreeTimes>();


        for (ExamMachine examMachine : room.getExamMachines()) {

            if (examMachine.getOutOfService()) {
                continue;
            }


            //todo: check requirements for room - exam eg. specific software

            DefaultWorkingHours hours = room.getCalendarEvent();
            DateTime startTime = new DateTime(hours.getStartTime());
            DateTime endTime = new DateTime(hours.getEndTime());


            Duration machineOpenDuration = new Duration(startTime, endTime);

            final Double examDuration = exam.getDuration();


            if (examDuration == 0) {
                continue;
            }

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

            String theDay = dayFormat.print(startTime);

            ArrayList<DayWithFreeTimes> possibleFreeSlots = new ArrayList<DayWithFreeTimes>(numberOfPossibleFreeSlots);

            System.out.println("slots for the day: " + numberOfPossibleFreeSlots + " time for single exam: " + timeForSingleExam + " daily total: " + machineOpenDuration.getStandardMinutes());

            DayWithFreeTimes day = new DayWithFreeTimes();
            day.setDate(theDay);
            for (int i = 0; i <= (numberOfPossibleFreeSlots - 1); i++) {

                System.out.println("room open: " + format.print(startTime) + " - " + format.print(endTime));

                //TODO: EXAM DURATION INSTEAD OF MACHINE OPEN DURATION?
                int shift = (examDuration.intValue() + transitionTime);

                DateTime freeTimeSlotStartTime = startTime.plusMinutes(i * shift);
                DateTime freeTimeSlotEndTime = freeTimeSlotStartTime.plusMinutes(shift);

                FreeTimeSlot possibleTimeSlot = new FreeTimeSlot();
                possibleTimeSlot.setStart(format.print(freeTimeSlotStartTime));
                possibleTimeSlot.setEnd(format.print(freeTimeSlotEndTime));
                System.out.println("shift start: " + possibleTimeSlot.getStart() + " - end: " + possibleTimeSlot.getEnd());
                //possibleTimeSlot.setTitle(String.format("%s - %s", room.getRoomCode(), examMachine.getName()));
                possibleTimeSlot.setTitle(examMachine.getName().replace(" ", ""));
                possibleTimeSlot.setRoom(room.getId());
                possibleTimeSlot.setMachine(examMachine.getId() + "");

                System.out.println("add machine : " + possibleTimeSlot.getTitle() + " - name " + examMachine.getId());

                day.getSlots().add(possibleTimeSlot);

            }

            for (FreeTimeSlot possibleFreeTimeSlot : day.getSlots()) {
                for (Reservation reservation : examMachine.getReservation()) {

                    Interval reservationDuration = new Interval(reservation.getStartAt().getTime(), reservation.getEndAt().getTime());
                    Interval possibleFreeTimeSlotDuration = new Interval(format.parseDateTime(possibleFreeTimeSlot.getStart()), format.parseDateTime(possibleFreeTimeSlot.getEnd()));

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
}