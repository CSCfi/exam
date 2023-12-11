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

import static org.joda.time.DateTimeConstants.MILLIS_PER_DAY;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import javax.inject.Inject;
import models.ExamRoom;
import models.Reservation;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import models.iop.ExternalReservation;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.LocalTime;
import org.joda.time.base.AbstractInterval;
import util.config.ConfigReader;

public class DateTimeHandlerImpl implements DateTimeHandler {

    private final ConfigReader configReader;

    @Inject
    public DateTimeHandlerImpl(ConfigReader configReader) {
        this.configReader = configReader;
    }

    @Override
    public List<Interval> findGaps(List<Interval> reserved, Interval searchInterval) {
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

    private List<Interval> getExistingIntervalGaps(List<Interval> reserved) {
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

    private List<Interval> removeNonOverlappingIntervals(List<Interval> reserved, Interval searchInterval) {
        return reserved.stream().filter(interval -> interval.overlaps(searchInterval)).toList();
    }

    private boolean hasNoOverlap(List<Interval> reserved, DateTime searchStart, DateTime searchEnd) {
        DateTime earliestStart = reserved.get(0).getStart();
        DateTime latestStop = reserved.get(reserved.size() - 1).getEnd();
        return (!searchEnd.isAfter(earliestStart) || !searchStart.isBefore(latestStop));
    }

    @Override
    public List<Interval> getExceptionEvents(
        List<ExceptionWorkingHours> hours,
        LocalDate date,
        RestrictionType restrictionType
    ) {
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

    @Override
    public List<Interval> mergeSlots(List<Interval> slots) {
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

    @Override
    public int resolveStartWorkingHourMillis(DateTime startTime, int timeZoneOffset) {
        return resolveMillisOfDay(startTime, timeZoneOffset);
    }

    @Override
    public int resolveEndWorkingHourMillis(DateTime endTime, int timeZoneOffset) {
        int millis = resolveMillisOfDay(endTime, timeZoneOffset);
        return millis == 0 ? MILLIS_PER_DAY - 1 : millis;
    }

    @Override
    public DateTime adjustDST(DateTime dateTime) {
        return doAdjustDST(dateTime, null);
    }

    @Override
    public DateTime adjustDST(DateTime dateTime, Reservation reservation) {
        return reservation.getExternalReservation() != null
            ? adjustDST(dateTime, reservation.getExternalReservation())
            : doAdjustDST(dateTime, reservation.getMachine().getRoom());
    }

    @Override
    public DateTime adjustDST(DateTime dateTime, ExternalReservation externalReservation) {
        DateTime result = dateTime;
        DateTimeZone dtz = DateTimeZone.forID(externalReservation.getRoomTz());
        if (!dtz.isStandardOffset(System.currentTimeMillis())) {
            result = dateTime.plusHours(1);
        }
        return result;
    }

    @Override
    public DateTime adjustDST(DateTime dateTime, ExamRoom room) {
        return doAdjustDST(dateTime, room);
    }

    private DateTime doAdjustDST(DateTime dateTime, ExamRoom room) {
        DateTimeZone dtz;
        DateTime result = dateTime;
        if (room == null) {
            dtz = configReader.getDefaultTimeZone();
        } else {
            dtz = DateTimeZone.forID(room.getLocalTimezone());
        }
        if (!dtz.isStandardOffset(System.currentTimeMillis())) {
            result = dateTime.plusHours(1);
        }
        return result;
    }

    @Override
    public DateTime normalize(DateTime dateTime, Reservation reservation) {
        DateTimeZone dtz = reservation.getMachine() == null
            ? configReader.getDefaultTimeZone()
            : DateTimeZone.forID(reservation.getMachine().getRoom().getLocalTimezone());
        return !dtz.isStandardOffset(dateTime.getMillis()) ? dateTime.minusHours(1) : dateTime;
    }

    @Override
    public DateTime normalize(DateTime dateTime, DateTimeZone dtz) {
        return !dtz.isStandardOffset(dateTime.getMillis()) ? dateTime.minusHours(1) : dateTime;
    }

    @Override
    public List<OpeningHours> getDefaultWorkingHours(LocalDate date, ExamRoom room) {
        String day = date.dayOfWeek().getAsText(Locale.ENGLISH);
        List<OpeningHours> hours = new ArrayList<>();
        room
            .getDefaultWorkingHours()
            .stream()
            .filter(dwh -> dwh.getWeekday().equalsIgnoreCase(day))
            .forEach(dwh -> {
                DateTime midnight = date.toDateTimeAtStartOfDay();
                DateTime start = midnight.withMillisOfDay(
                    resolveStartWorkingHourMillis(new DateTime(dwh.getStartTime()), dwh.getTimezoneOffset())
                );
                DateTime end = midnight.withMillisOfDay(
                    resolveEndWorkingHourMillis(new DateTime(dwh.getEndTime()), dwh.getTimezoneOffset())
                );
                Interval interval = new Interval(start, end);
                hours.add(new OpeningHours(interval, dwh.getTimezoneOffset()));
            });
        return hours;
    }

    @Override
    public int getTimezoneOffset(LocalDate date, ExamRoom room) {
        String day = date.dayOfWeek().getAsText(Locale.ENGLISH);
        for (DefaultWorkingHours defaultHour : room.getDefaultWorkingHours()) {
            if (defaultHour.getWeekday().equalsIgnoreCase(day)) {
                return defaultHour.getTimezoneOffset();
            }
        }
        return 0;
    }

    @Override
    public List<OpeningHours> getWorkingHoursForDate(LocalDate date, ExamRoom room) {
        List<OpeningHours> workingHours = getDefaultWorkingHours(date, room);
        List<Interval> extensionEvents = mergeSlots(
            getExceptionEvents(room.getCalendarExceptionEvents(), date, RestrictionType.NON_RESTRICTIVE)
        );
        List<Interval> restrictionEvents = mergeSlots(
            getExceptionEvents(room.getCalendarExceptionEvents(), date, RestrictionType.RESTRICTIVE)
        );
        List<OpeningHours> availableHours = new ArrayList<>();
        if (!extensionEvents.isEmpty()) {
            List<Interval> unifiedIntervals = mergeSlots(
                Stream.concat(workingHours.stream().map(OpeningHours::getHours), extensionEvents.stream()).toList()
            );
            int tzOffset;
            if (workingHours.isEmpty()) {
                LocalTime lt = LocalTime.now().withHourOfDay(java.time.LocalTime.NOON.getHour());
                tzOffset = DateTimeZone.forID(room.getLocalTimezone()).getOffset(date.toDateTime(lt));
            } else {
                tzOffset = workingHours.get(0).getTimezoneOffset();
            }
            workingHours.clear();
            workingHours.addAll(
                unifiedIntervals.stream().map(interval -> new OpeningHours(interval, tzOffset)).toList()
            );
        }
        if (!restrictionEvents.isEmpty()) {
            for (OpeningHours hours : workingHours) {
                Interval slot = hours.getHours();
                for (Interval gap : findGaps(restrictionEvents, slot)) {
                    availableHours.add(new OpeningHours(gap, hours.getTimezoneOffset()));
                }
            }
        } else {
            availableHours = workingHours;
        }
        return availableHours;
    }

    private int resolveMillisOfDay(DateTime date, long offset) {
        long millis = date.getMillisOfDay() + offset;
        if (millis >= MILLIS_PER_DAY) {
            return (int) Math.abs(millis - MILLIS_PER_DAY);
        }
        return (int) millis;
    }
}
