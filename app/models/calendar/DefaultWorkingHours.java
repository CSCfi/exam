package models.calendar;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import models.ExamRoom;
import models.base.GeneratedIdentityModel;
import org.joda.time.DateTime;
import util.DateTimeAdapter;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

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
}
