// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.datetime;

import static org.joda.time.DateTimeConstants.MILLIS_PER_DAY;

import com.google.common.collect.Lists;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
import javax.inject.Inject;
import miscellaneous.config.ConfigReader;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import models.enrolment.ExternalReservation;
import models.enrolment.Reservation;
import models.facility.ExamRoom;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.LocalDate;

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
        DateTime subEarliestStart = subReservedList.getFirst().getStart();
        DateTime subLatestEnd = subReservedList.getLast().getEnd();

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
        Interval current = reserved.getFirst();
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
        return reserved
            .stream()
            .filter(interval -> interval.overlaps(searchInterval))
            .toList();
    }

    private boolean hasNoOverlap(List<Interval> reserved, DateTime searchStart, DateTime searchEnd) {
        DateTime earliestStart = reserved.getFirst().getStart();
        DateTime latestStop = reserved.getLast().getEnd();
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
                // exception covers this day fully
                if (exception.contains(wholeDay) || exception.equals(wholeDay)) {
                    exceptions.clear();
                    exceptions.add(wholeDay);
                } else if (exception.overlaps(wholeDay)) {
                    // exception starts this day but ends on a later day
                    if (start.toLocalDate().equals(date) && end.toLocalDate().isAfter(date)) {
                        exceptions.add(new Interval(exception.getStart(), wholeDay.getEnd()));
                    }
                    // exception ends this day but starts on an earlier day
                    else if (start.toLocalDate().isBefore(date) && end.toLocalDate().equals(date)) {
                        exceptions.add(new Interval(wholeDay.getStart(), exception.getEnd()));
                    }
                    // exception starts and ends this day
                    else {
                        exceptions.add(
                            new Interval(exception.getStart().withDate(date), exception.getEnd().withDate(date))
                        );
                    }
                }
            }
        }
        return exceptions;
    }

    @Override
    public List<Interval> mergeSlots(List<Interval> intervals) {
        if (intervals.size() <= 1) {
            return intervals;
        }
        // make sure the list is mutable, otherwise sorting fails
        var slots = new ArrayList<>(intervals);
        slots.sort(Comparator.comparing(Interval::getStart));
        boolean isMerged = false;
        List<Interval> merged = new ArrayList<>();
        merged.add(slots.getFirst());
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
        DateTimeZone dtz =
            reservation.getMachine() == null
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
    public int getTimezoneOffset(DateTime date) {
        return configReader.getDefaultTimeZone().getOffset(date);
    }

    @Override
    public List<OpeningHours> getWorkingHoursForDate(LocalDate date, ExamRoom room) {
        List<OpeningHours> workingHours = getDefaultWorkingHours(date, room);
        List<Interval> extensionEvents = mergeSlots(
            getExceptionEvents(
                Lists.newArrayList(room.getCalendarExceptionEvents()),
                date,
                RestrictionType.NON_RESTRICTIVE
            )
        );
        List<Interval> restrictionEvents = mergeSlots(
            getExceptionEvents(Lists.newArrayList(room.getCalendarExceptionEvents()), date, RestrictionType.RESTRICTIVE)
        );
        List<OpeningHours> availableHours = new ArrayList<>();
        if (!extensionEvents.isEmpty()) {
            List<Interval> unifiedIntervals = mergeSlots(
                Stream.concat(workingHours.stream().map(OpeningHours::getHours), extensionEvents.stream()).toList()
            );
            int offset = DateTimeZone.forID(room.getLocalTimezone()).getOffset(DateTime.now().withDayOfYear(1));
            workingHours.clear();
            workingHours.addAll(
                unifiedIntervals
                    .stream()
                    .map(interval -> new OpeningHours(interval, offset))
                    .toList()
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
