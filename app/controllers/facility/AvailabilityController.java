// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.facility;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.DB;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.inject.Inject;
import miscellaneous.datetime.DateTimeHandler;
import models.enrolment.Reservation;
import models.facility.ExamRoom;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import play.libs.Json;
import play.mvc.Result;

public class AvailabilityController extends BaseController {

    private final DateTimeHandler dateTimeHandler;

    @Inject
    public AvailabilityController(DateTimeHandler dateTimeHandler) {
        this.dateTimeHandler = dateTimeHandler;
    }

    private static DateTime parseSearchStartDate(String day) {
        return ISODateTimeFormat.dateTimeParser().parseDateTime(day).withDayOfWeek(1).withMillisOfDay(0);
    }

    private static DateTime getSearchEndDate(DateTime start) {
        return start.dayOfWeek().withMaximumValue().millisOfDay().withMaximumValue();
    }

    private List<Reservation> getReservationsDuring(List<Reservation> reservations, Interval interval) {
        return reservations.stream().filter(r -> interval.overlaps(r.toInterval())).toList();
    }

    private List<Interval> toOneHourChunks(Interval i) {
        DateTime window = i.getStart();
        List<Interval> hourly = new ArrayList<>();
        while (window.isBefore(i.getEnd())) {
            DateTime next = window.plusHours(1);
            hourly.add(new Interval(window, next));
            window = next;
        }
        return hourly;
    }

    private Interval round(Interval slot) {
        DateTime cleanedStart = slot.getStart().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0);
        DateTime newEnd = slot.getEnd().getMinuteOfHour() != 0 ? slot.getEnd().plusHours(1) : slot.getEnd();
        DateTime cleanedEnd = newEnd.withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0);
        return slot.withStart(cleanedStart).withEnd(cleanedEnd);
    }

    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    public Result getAvailability(Long roomId, String day) {
        ExamRoom room = DB.find(ExamRoom.class, roomId);
        if (room == null) {
            return notFound();
        }
        DateTime searchStart = parseSearchStartDate(day);
        DateTime searchEnd = getSearchEndDate(searchStart);
        List<Reservation> reservations = DB
            .find(Reservation.class)
            .where()
            .eq("machine.room.id", roomId)
            .between("startAt", searchStart.toDate(), searchEnd.toDate())
            .findList();

        Set<Interval> allSlots = new LinkedHashSet<>();
        LocalDate window = searchStart.toLocalDate();
        while (!window.isAfter(searchEnd.toLocalDate())) {
            List<Interval> slotsForDate = dateTimeHandler
                .getWorkingHoursForDate(window, room)
                .stream()
                .map(oh ->
                    new Interval(
                        oh.getHours().getStart().minusMillis(oh.getTimezoneOffset()),
                        oh.getHours().getEnd().minusMillis(oh.getTimezoneOffset())
                    )
                )
                .map(this::round)
                .flatMap(i -> toOneHourChunks(i).stream())
                .toList();
            allSlots.addAll(slotsForDate);
            window = window.plusDays(1);
        }

        Map<Interval, List<Reservation>> reservationMap = allSlots
            .stream()
            .collect(Collectors.toMap(Function.identity(), i -> getReservationsDuring(reservations, i)));

        int machineCount = room.getExamMachines().stream().filter(m -> !m.getOutOfService()).mapToInt(e -> 1).sum();

        List<Availability> availability = reservationMap
            .entrySet()
            .stream()
            .map(e -> new Availability(e.getKey(), machineCount, e.getValue().size()))
            .toList();

        return ok(Json.toJson(availability));
    }

    // DTO aimed for clients
    protected static class Availability {

        private final String start;
        private final String end;
        private final int total;
        private final int reserved;

        Availability(Interval interval, int total, int reserved) {
            start = ISODateTimeFormat.dateTime().print(interval.getStart());
            end = ISODateTimeFormat.dateTime().print(interval.getEnd());
            this.total = total;
            this.reserved = reserved;
        }

        public String getStart() {
            return start;
        }

        public String getEnd() {
            return end;
        }

        public int getTotal() {
            return total;
        }

        public int getReserved() {
            return reserved;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Availability a)) return false;
            return new EqualsBuilder().append(start, a.start).append(end, a.end).build();
        }

        @Override
        public int hashCode() {
            return new HashCodeBuilder().append(start).append(end).build();
        }
    }
}
