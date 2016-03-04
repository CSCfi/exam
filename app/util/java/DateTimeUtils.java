package util.java;

import models.calendar.ExceptionWorkingHours;
import org.joda.time.DateTime;
import static org.joda.time.DateTimeConstants.MILLIS_PER_DAY;
import org.joda.time.Interval;
import org.joda.time.LocalDate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

public class DateTimeUtils {

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

    public static List<Interval> getExistingIntervalGaps(List<Interval> reserved) {
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

    public static List<Interval> removeNonOverlappingIntervals(List<Interval> reserved, Interval searchInterval) {
        return reserved.stream().filter(interval -> interval.overlaps(searchInterval)).collect(Collectors.toList());
    }

    public static boolean hasNoOverlap(List<Interval> reserved, DateTime searchStart, DateTime searchEnd) {
        DateTime earliestStart = reserved.get(0).getStart();
        DateTime latestStop = reserved.get(reserved.size() - 1).getEnd();
        return !searchEnd.isAfter(earliestStart) || !searchStart.isBefore(latestStop);
    }

    public static List<Interval> getExceptionEvents(List<ExceptionWorkingHours> hours, LocalDate date, boolean isRestriction) {
        List<Interval> exceptions = new ArrayList<>();
        for (ExceptionWorkingHours ewh : hours) {
            if (isRestriction == ewh.isOutOfService()) {
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
        Collections.sort(slots, new Comparator<Interval>() {
            @Override
            public int compare(Interval o1, Interval o2) {
                return o1.getStart().compareTo(o2.getStart());
            }
        });
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

    public static int resolveStartWorkingHourMillis(Date startTime, int timeZoneOffset) {
        return resolveMillisOfDay(startTime, timeZoneOffset);
    }

    public static int resolveEndWorkingHourMillis(Date endTime, int timeZoneOffset) {
        int millis = resolveMillisOfDay(endTime, timeZoneOffset);
        return millis == 0 ? MILLIS_PER_DAY - 1 : millis;
    }

    private static int resolveMillisOfDay(Date date, long offset) {
        DateTime dateTime = new DateTime(date.getTime());
        long millis = dateTime.getMillisOfDay() + offset;
        if (millis >= MILLIS_PER_DAY) {
            return (int) Math.abs(millis - MILLIS_PER_DAY);
        }
        return (int) millis;
    }


}