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

package models.calendar;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
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

    @Transient
    public boolean overlaps(DefaultWorkingHours other) {
        if (!weekday.equals(other.weekday)) {
            return false;
        }
        Interval i1 = new Interval(startTime.withDate(LocalDate.now()), endTime.withDate(LocalDate.now()));
        Interval i2 = new Interval(other.startTime.withDate(LocalDate.now()), other.endTime.withDate(LocalDate.now()));
        return i1.overlaps(i2);
    }
}
