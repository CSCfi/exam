// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.calendar;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import models.ExamRoom;
import models.base.GeneratedIdentityModel;
import org.joda.time.DateTime;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import util.datetime.DateTimeAdapter;

@Entity
public class DefaultWorkingHours extends GeneratedIdentityModel {

    @Temporal(TemporalType.TIME)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime startTime;

    @Temporal(TemporalType.TIME)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime endTime;

    private int timezoneOffset;

    private String weekday;

    @ManyToOne
    @JsonBackReference
    private ExamRoom room;

    public ExamRoom getRoom() {
        return room;
    }

    public void setRoom(ExamRoom room) {
        this.room = room;
    }

    public DateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(DateTime startTime) {
        this.startTime = startTime;
    }

    public DateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(DateTime endTime) {
        this.endTime = endTime;
    }

    public String getWeekday() {
        return weekday;
    }

    public void setWeekday(String weekday) {
        this.weekday = weekday;
    }

    public int getTimezoneOffset() {
        return timezoneOffset;
    }

    public void setTimezoneOffset(int timezoneOffset) {
        this.timezoneOffset = timezoneOffset;
    }

    public boolean overlaps(DefaultWorkingHours other) {
        return weekday.equals(other.weekday) && toInterval().overlaps(other.toInterval());
    }

    private Interval toInterval() {
        if (startTime.isAfter(endTime)) {
            return new Interval(startTime.withDate(LocalDate.now()).minusDays(1), endTime.withDate(LocalDate.now()));
        } else {
            return new Interval(startTime.withDate(LocalDate.now()), endTime.withDate(LocalDate.now()));
        }
    }
}
