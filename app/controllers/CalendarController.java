package controllers;

import Exceptions.MalformedDataException;
import com.avaje.ebean.Ebean;
import models.*;
import models.calendar.DefaultWorkingHours;
import org.joda.time.DateMidnight;
import org.joda.time.DateTime;
import org.joda.time.Duration;
import org.joda.time.Interval;
import org.joda.time.format.DateTimeFormat;
import play.libs.Json;
import play.mvc.Result;

import java.util.ArrayList;
import java.util.Arrays;

public class CalendarController extends SitnetController {


    public static Result getSlots(String inputDate) throws MalformedDataException {


        //todo: validate
        Long selectedExamId = 1L;


        Long examRoomId = 1L;

        //
        // 1. laske kaikki mahdolliset aikaslotit per kone within default working hours
        // 2. poista ne ajat jotka leikkaa toisten varausten kanssa per kone
        // 3.


        User user = Ebean.find(User.class, 3);//UserController.getLoggedUser();

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

        DateTime searchDate = DateMidnight.parse(inputDate, DateTimeFormat.forPattern("dd.MM.yyyy")).toDateTime();


        if (searchDate.isAfter(examEndDateTime)) {
            throw new MalformedDataException(String.format("Given date (%s) is after active exam(%s) date(%s)", searchDate, exam.getId(), examEndDateTime));
        }


        ArrayList<FreeTimeSlot> allPossibleFreeTimeSlots = new ArrayList<FreeTimeSlot>();

        for (ExamMachine examMachine : room.getExamMachines()) {

            if (!examMachine.getOutOfService()) {
                continue;
            }

            //todo: check requirements for room - exam eg. specific software

            DefaultWorkingHours hours = room.getCalendarEvent();
            DateTime startTime = new DateTime(hours.getStartTime());
            DateTime endTime = new DateTime(hours.getEndTime());

            Duration machineOpenDuration = new Duration(startTime, endTime);

            final Double examDuration = exam.getDuration();
            long examDurationInMinutes = Math.round(examDuration * 60);

            int translationTime = 0;
            try {
                translationTime = Integer.parseInt(room.getTransitionTime());
            } catch (Throwable t) {
            }

            int numberOfPossibleFreeSlots = (int) Math.floor(machineOpenDuration.getStandardMinutes() / (examDurationInMinutes + translationTime));

            if (numberOfPossibleFreeSlots <= 0) {
                continue;
            }

            ArrayList<FreeTimeSlot> possibleFreeSlots = new ArrayList<FreeTimeSlot>(numberOfPossibleFreeSlots);

            for (int i = 0; i <= numberOfPossibleFreeSlots; i++) {

                int shift = (machineOpenDuration.toStandardMinutes().getMinutes() + translationTime);

                DateTime freeTimeSlotStartTime = startTime.plusMinutes(i * shift);
                DateTime freeTimeSlotEndTime = freeTimeSlotStartTime.plusMinutes(shift);

                FreeTimeSlot possibleTimeSlot = new FreeTimeSlot(freeTimeSlotStartTime.toDate(), freeTimeSlotEndTime.toDate(), Arrays.asList(room.getId().toString()), room.getId(), "title here");
                possibleFreeSlots.add(possibleTimeSlot);
            }

            for (FreeTimeSlot possibleFreeTimeSlot : possibleFreeSlots) {
                for (Reservation reservation : examMachine.getReservation()) {

                    Interval reservationDuration = new Interval(reservation.getStartAt().getTime(), reservation.getEndAt().getTime());
                    Interval possibleFreeTimeSlotDuration = new Interval(possibleFreeTimeSlot.getStart().getTime(), possibleFreeTimeSlot.getEnd().getTime());

                    //remove if intersects
                    if (possibleFreeTimeSlotDuration.overlaps(reservationDuration)) {
                        possibleFreeSlots.remove(possibleFreeTimeSlot);
                    }
                }
            }

            allPossibleFreeTimeSlots.addAll(possibleFreeSlots);

        }


        return ok(Json.toJson(allPossibleFreeTimeSlots));

    }
}