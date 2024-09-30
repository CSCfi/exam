// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.datetime;

import java.util.List;
import models.calendar.ExceptionWorkingHours;
import models.enrolment.ExternalReservation;
import models.enrolment.Reservation;
import models.facility.ExamRoom;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.LocalDate;

public interface DateTimeHandler {
    enum RestrictionType {
        RESTRICTIVE,
        NON_RESTRICTIVE,
    }

    class OpeningHours {

        private final Interval hours;
        private final int timezoneOffset;

        OpeningHours(Interval interval, int timezoneOffset) {
            this.hours = interval;
            this.timezoneOffset = timezoneOffset;
        }

        public int getTimezoneOffset() {
            return timezoneOffset;
        }

        public Interval getHours() {
            return hours;
        }
    }

    List<Interval> findGaps(List<Interval> reserved, Interval searchInterval);
    List<Interval> getExceptionEvents(
        List<ExceptionWorkingHours> hours,
        LocalDate date,
        RestrictionType restrictionType
    );
    List<Interval> mergeSlots(List<Interval> slots);
    int resolveStartWorkingHourMillis(DateTime startTime, int timeZoneOffset);
    int resolveEndWorkingHourMillis(DateTime endTime, int timeZoneOffset);
    DateTime adjustDST(DateTime dateTime);
    DateTime adjustDST(DateTime dateTime, Reservation reservation);
    DateTime adjustDST(DateTime dateTime, ExternalReservation externalReservation);
    DateTime adjustDST(DateTime dateTime, ExamRoom room);
    DateTime normalize(DateTime dateTime, Reservation reservation);
    DateTime normalize(DateTime dateTime, DateTimeZone dtz);
    List<OpeningHours> getDefaultWorkingHours(LocalDate date, ExamRoom room);
    int getTimezoneOffset(LocalDate date, ExamRoom room);
    int getTimezoneOffset(DateTime date);
    List<OpeningHours> getWorkingHoursForDate(LocalDate date, ExamRoom room);
}
