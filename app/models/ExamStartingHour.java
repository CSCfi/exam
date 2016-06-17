package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonFormat;
import models.base.GeneratedIdentityModel;
import org.joda.time.LocalTime;

import javax.annotation.Nonnull;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import java.util.Date;

@Entity
public class ExamStartingHour extends GeneratedIdentityModel implements Comparable<ExamStartingHour> {

    @Temporal(TemporalType.TIME)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mmZ")
    private Date startingHour;

    private int timezoneOffset;

    @ManyToOne
    @JsonBackReference
    private ExamRoom room;

    public ExamRoom getRoom() {
        return room;
    }

    public void setRoom(ExamRoom room) {
        this.room = room;
    }

    public Date getStartingHour() {
        return startingHour;
    }

    public void setStartingHour(Date startingHour) {
        this.startingHour = startingHour;
    }

    public int getTimezoneOffset() {
        return timezoneOffset;
    }

    public void setTimezoneOffset(int timezoneOffset) {
        this.timezoneOffset = timezoneOffset;
    }

    @Override
    public int compareTo(@Nonnull ExamStartingHour o) {
        return new LocalTime(startingHour).plusMillis(timezoneOffset).compareTo(
                new LocalTime(o.startingHour).plusMillis(timezoneOffset));
    }
}
