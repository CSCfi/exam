package backend.impl;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.google.inject.ImplementedBy;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Result;

import backend.exceptions.NotFoundException;
import backend.models.Exam;
import backend.models.ExamMachine;
import backend.models.ExamRoom;
import backend.models.Reservation;
import backend.models.User;

@ImplementedBy(CalendarHandlerImpl.class)
public interface CalendarHandler {

    Result getSlots(User user, Exam exam, Long roomId, String day, Collection<Integer> aids);
    List<ExamMachine> getEligibleMachines(ExamRoom room, Collection<Integer> access, Exam exam);
    Set<TimeSlot> handleReservations(Map<Interval, Optional<Integer>> examSlots, Collection<Reservation> reservations,
                                     Exam exam, Collection<ExamMachine> machines, User user);
    Collection<Interval> gatherSuitableSlots(ExamRoom room, LocalDate date, Integer examDuration);
    LocalDate parseSearchDate(String day, Exam exam, ExamRoom room) throws NotFoundException;
    Optional<ExamMachine> getRandomMachine(ExamRoom room, Exam exam, DateTime start, DateTime end,
                                           Collection<Integer> aids);

    Reservation createReservation(DateTime start, DateTime end, ExamMachine machine, User user,
                                  Collection<Long> sectionIds);
    LocalDate getEndSearchDate(LocalDate searchDate, LocalDate examEnd);
    int getReservationWindowSize();
    boolean isDoable(Reservation reservation, Collection<Integer> aids);

    class TimeSlot {
        private final Interval interval;
        private final String start;
        private final String end;
        private final int availableMachines;
        private final boolean ownReservation;
        private final String conflictingExam;

        public TimeSlot(Interval interval, int machineCount, String exam) {
            this.interval = interval;
            start = ISODateTimeFormat.dateTime().print(interval.getStart());
            end = ISODateTimeFormat.dateTime().print(interval.getEnd());
            availableMachines = machineCount;
            ownReservation = machineCount < 0;
            conflictingExam = exam;
        }

        Interval getInterval() {
            return interval;
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
