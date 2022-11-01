/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package util.datetime;

import java.util.List;
import models.ExamRoom;
import models.Reservation;
import models.calendar.ExceptionWorkingHours;
import models.iop.ExternalReservation;
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
    List<OpeningHours> getWorkingHoursForDate(LocalDate date, ExamRoom room);
}
