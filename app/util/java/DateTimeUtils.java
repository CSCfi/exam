package util.java;

import models.calendar.ExceptionWorkingHours;
import org.joda.time.DateTime;
import org.joda.time.Interval;
import org.joda.time.LocalDate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

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
        List<Interval> subExistingList = removeNoneOverlappingIntervals(reserved, searchInterval);
        DateTime subEarliestStart = subExistingList.get(0).getStart();
        DateTime subLatestStop = subExistingList.get(subExistingList.size() - 1).getEnd();

        // in case the searchInterval is wider than the union of the existing
        // include searchInterval.start => earliestExisting.start
        if (searchStart.isBefore(subEarliestStart)) {
            gaps.add(new Interval(searchStart, subEarliestStart));
        }

        // get all the gaps in the existing list
        gaps.addAll(getExistingIntervalGaps(subExistingList));

        // include latestExisting.stop => searchInterval.stop
        if (searchEnd.isAfter(subLatestStop)) {
            gaps.add(new Interval(subLatestStop, searchEnd));
        }
        return gaps;

    }

    public static List<Interval> getExistingIntervalGaps(List<Interval> existingList) {
        List<Interval> gaps = new ArrayList<>();
        Interval current = existingList.get(0);
        for (int i = 1; i < existingList.size(); i++) {
            Interval next = existingList.get(i);
            Interval gap = current.gap(next);
            if (gap != null)
                gaps.add(gap);
            current = next;
        }
        return gaps;
    }


    public static List<Interval> removeNoneOverlappingIntervals(List<Interval> existingIntervals, Interval searchInterval) {
        List<Interval> subExistingList = new ArrayList<>();
        for (Interval interval : existingIntervals) {
            if (interval.overlaps(searchInterval)) {
                subExistingList.add(interval);
            }
        }
        return subExistingList;
    }

    public static boolean hasNoOverlap(List<Interval> reserved, DateTime searchStart, DateTime searchEnd) {
        DateTime earliestStart = reserved.get(0).getStart();
        DateTime latestStop = reserved.get(reserved.size() - 1).getEnd();
        // return the entire search interval if it does not overlap with
        // existing at all
        return searchEnd.isBefore(earliestStart) || searchStart.isAfter(latestStop);
    }

    public static List<Interval> getExceptionEvents(List<ExceptionWorkingHours> hours, LocalDate date) {
        List<Interval> exceptions = new ArrayList<>();
        for (ExceptionWorkingHours ewh : hours) {
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
                merged.add(new Interval(first.getStart(), first.getEnd().isAfter(second.getEnd()) ? first.getEnd() : second.getEnd()));
                isMerged = true;
            } else {
                merged.add(second);
            }
        }
        if (isMerged) {
            merged = mergeSlots(merged);
        }
        return merged;
    }


}
