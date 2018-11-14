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

package backend.controllers;

import backend.controllers.base.BaseController;
import backend.models.ExamRoom;
import backend.models.Reservation;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import play.libs.Json;
import play.mvc.Result;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;


public class AvailabilityController extends BaseController {

    private static DateTime parseSearchStartDate(String day) {
        return ISODateTimeFormat.dateTimeParser()
                .parseDateTime(day)
                .withDayOfWeek(1)
                .withMillisOfDay(0);
    }

    private static DateTime getSearchEndDate(DateTime start) {
        return start.dayOfWeek().withMaximumValue().millisOfDay().withMaximumValue();
    }

    private List<Reservation> getReservationsDuring(List<Reservation> reservations, Interval interval) {
        return reservations.stream()
                .filter(r -> interval.overlaps(r.toInterval()))
                .collect(Collectors.toList());
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

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result getAvailability(Long roomId, String day) {
        ExamRoom room = Ebean.find(ExamRoom.class, roomId);
        if (room == null) {
            return notFound();
        }
        DateTime searchStart = parseSearchStartDate(day);
        DateTime searchEnd = getSearchEndDate(searchStart);
        List<Reservation> reservations = Ebean.find(Reservation.class)
                .where()
                .eq("machine.room.id", roomId)
                .between("startAt", searchStart.toDate(), searchEnd.toDate())
                .findList();

        Set<Interval> allSlots = new LinkedHashSet<>();
        LocalDate window = searchStart.toLocalDate();
        while (!window.isAfter(searchEnd.toLocalDate())) {
            List<Interval> slotsForDate = room.getWorkingHoursForDate(window)
                    .stream()
                    .map(oh -> new Interval(oh.getHours().getStart().minusMillis(oh.getTimezoneOffset()),
                            oh.getHours().getEnd().minusMillis(oh.getTimezoneOffset())))
                    .map(this::round)
                    .flatMap(i -> toOneHourChunks(i).stream())
                    .collect(Collectors.toList());
            allSlots.addAll(slotsForDate);
            window = window.plusDays(1);
        }

        Map<Interval, List<Reservation>> reservationMap = allSlots.stream()
                .collect(Collectors.toMap(Function.identity(), i -> getReservationsDuring(reservations, i)));

       int machineCount = room.getExamMachines().stream()
               .filter(m -> !m.getOutOfService())
               .mapToInt(e -> 1)
               .sum();

        List<Availability> availability = reservationMap.entrySet().stream()
                .map(e -> new Availability(e.getKey(), machineCount, e.getValue().size()))
                .collect(Collectors.toList());

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
            if (!(o instanceof Availability)) return false;
            Availability a = (Availability) o;
            return new EqualsBuilder().append(start, a.start).append(end, a.end).build();
        }

        @Override
        public int hashCode() {
            return new HashCodeBuilder().append(start).append(end).build();
        }

    }

}
