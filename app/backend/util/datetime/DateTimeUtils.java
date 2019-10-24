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

package backend.util.datetime;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

import com.typesafe.config.ConfigFactory;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.base.AbstractInterval;

import backend.models.ExamRoom;
import backend.models.Reservation;
import backend.models.calendar.ExceptionWorkingHours;
import backend.models.iop.ExternalReservation;

import static org.joda.time.DateTimeConstants.MILLIS_PER_DAY;

public class DateTimeUtils {

    public enum RestrictionType {RESTRICTIVE, NON_RESTRICTIVE}

    public static List<Interval> findGaps(List<Interval> reserved, Interval searchInterval) {
        List<Interval> gaps = new ArrayList<>();
        DateTime searchStart = searchInterval.getStart();
        DateTime searchEnd = searchInterval.getEnd();
        if (hasNoOverlap(reserved, searchStart, searchEnd)) {
            gaps.add(searchInterval);
            return gaps;
        }
        // create a sub-list that excludes interval which does not overlap with
        // searchInterval
        List<Interval> subReservedList = removeNonOverlappingIntervals(reserved, searchInterval);
        DateTime subEarliestStart = subReservedList.get(0).getStart();
        DateTime subLatestEnd = subReservedList.get(subReservedList.size() - 1).getEnd();

        // in case the searchInterval is wider than the union of the existing
        // include searchInterval.start => earliestExisting.start
        if (searchStart.isBefore(subEarliestStart)) {
            gaps.add(new Interval(searchStart, subEarliestStart));
        }

        // get all the gaps in the existing list
        gaps.addAll(getExistingIntervalGaps(subReservedList));

        // include latestExisting.end => searchInterval.end
        if (searchEnd.isAfter(subLatestEnd)) {
            gaps.add(new Interval(subLatestEnd, searchEnd));
        }
        return gaps;

    }

    private static List<Interval> getExistingIntervalGaps(List<Interval> reserved) {
        List<Interval> gaps = new ArrayList<>();
        Interval current = reserved.get(0);
        for (int i = 1; i < reserved.size(); i++) {
            Interval next = reserved.get(i);
            Interval gap = current.gap(next);
            if (gap != null) {
                gaps.add(gap);
            }
            current = next;
        }
        return gaps;
    }

    private static List<Interval> removeNonOverlappingIntervals(List<Interval> reserved, Interval searchInterval) {
        return reserved.stream().filter(interval -> interval.overlaps(searchInterval)).collect(Collectors.toList());
    }

    private static boolean hasNoOverlap(List<Interval> reserved, DateTime searchStart, DateTime searchEnd) {
        DateTime earliestStart = reserved.get(0).getStart();
        DateTime latestStop = reserved.get(reserved.size() - 1).getEnd();
        return !searchEnd.isAfter(earliestStart) || !searchStart.isBefore(latestStop);
    }

    public static List<Interval> getExceptionEvents(List<ExceptionWorkingHours> hours, LocalDate date, RestrictionType restrictionType) {
        List<Interval> exceptions = new ArrayList<>();
        for (ExceptionWorkingHours ewh : hours) {
            boolean isApplicable =
                    (restrictionType == RestrictionType.RESTRICTIVE && ewh.isOutOfService()) ||
                            (restrictionType == RestrictionType.NON_RESTRICTIVE && !ewh.isOutOfService());
            if (isApplicable) {
                DateTime start = new DateTime(ewh.getStartDate()).plusMillis(ewh.getStartDateTimezoneOffset());
                DateTime end = new DateTime(ewh.getEndDate()).plusMillis(ewh.getEndDateTimezoneOffset());
                Interval exception = new Interval(start, end);
                Interval wholeDay = date.toInterval();
                if (exception.contains(wholeDay) || exception.equals(wholeDay)) {
                    exceptions.clear();
                    exceptions.add(wholeDay);
                    break;
                }
                if (exception.overlaps(wholeDay)) {
                    exceptions.add(new Interval(exception.getStart(), exception.getEnd()));
                }
            }
        }
        return exceptions;
    }

    public static List<Interval> mergeSlots(List<Interval> slots) {
        if (slots.size() <= 1) {
            return slots;
        }
        slots.sort(Comparator.comparing(AbstractInterval::getStart));
        boolean isMerged = false;
        List<Interval> merged = new ArrayList<>();
        merged.add(slots.get(0));
        for (int i = 1; i < slots.size(); ++i) {
            Interval first = slots.get(i - 1);
            Interval second = slots.get(i);
            if (!second.getStart().isAfter(first.getEnd())) {
                merged.remove(i - 1);
                DateTime laterEnding = first.getEnd().isAfter(second.getEnd()) ? first.getEnd() : second.getEnd();
                merged.add(new Interval(first.getStart(), laterEnding));
                isMerged = true;
            } else {
                merged.add(second);
            }
        }
        if (isMerged) {
            merged = mergeSlots(merged);
        }
        // Nothing to merge anymore
        return merged;
    }

    public static int resolveStartWorkingHourMillis(DateTime startTime, int timeZoneOffset) {
        return resolveMillisOfDay(startTime, timeZoneOffset);
    }

    public static int resolveEndWorkingHourMillis(DateTime endTime, int timeZoneOffset) {
        int millis = resolveMillisOfDay(endTime, timeZoneOffset);
        return millis == 0 ? MILLIS_PER_DAY - 1 : millis;
    }

    public static DateTime adjustDST(DateTime dateTime) {
        // FIXME: this method should be made unnecessary, DST adjustments should always be done based on reservation data.
        // Until we get some of the queries rephrased, we have to live with this quick-fix
        return doAdjustDST(dateTime, null);
    }

    public static DateTime adjustDST(DateTime dateTime, Reservation reservation) {
        return reservation.getExternalReservation() != null ?
                adjustDST(dateTime, reservation.getExternalReservation()) :
                doAdjustDST(dateTime, reservation.getMachine().getRoom());
    }

    public static DateTime adjustDST(DateTime dateTime, ExternalReservation externalReservation) {
        DateTime result = dateTime;
        DateTimeZone dtz = DateTimeZone.forID(externalReservation.getRoomTz());
        if (!dtz.isStandardOffset(System.currentTimeMillis())) {
            result = dateTime.plusHours(1);
        }
        return result;
    }

    public static DateTime adjustDST(DateTime dateTime, ExamRoom room) {
        return doAdjustDST(dateTime, room);
    }

    private static DateTimeZone getDefaultTimeZone() {
        String config = ConfigFactory.load().getString("sitnet.application.timezone");
        return DateTimeZone.forID(config);
    }

    private static DateTime doAdjustDST(DateTime dateTime, ExamRoom room) {
        DateTimeZone dtz;
        DateTime result = dateTime;
        if (room == null) {
            dtz = getDefaultTimeZone();
        } else {
            dtz = DateTimeZone.forID(room.getLocalTimezone());
        }
        if (!dtz.isStandardOffset(System.currentTimeMillis())) {
            result = dateTime.plusHours(1);
        }
        return result;
    }

    public static DateTime withTimeAtStartOfDayConsideringTz(DateTime src) {
        DateTimeZone dtz = getDefaultTimeZone();
        return src.withTimeAtStartOfDay().plusMillis(dtz.getOffset(src));
    }

    public static DateTime withTimeAtEndOfDayConsideringTz(DateTime src) {
        DateTimeZone dtz = getDefaultTimeZone();
        return src.plusDays(1).withTimeAtStartOfDay().plusMillis(dtz.getOffset(src));
    }

    private static int resolveMillisOfDay(DateTime date, long offset) {
        long millis = date.getMillisOfDay() + offset;
        if (millis >= MILLIS_PER_DAY) {
            return (int) Math.abs(millis - MILLIS_PER_DAY);
        }
        return (int) millis;
    }


}
