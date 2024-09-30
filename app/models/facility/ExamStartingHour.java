// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import java.util.Date;
import javax.annotation.Nonnull;
import models.base.GeneratedIdentityModel;
import org.joda.time.LocalTime;

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
        return new LocalTime(startingHour)
            .plusMillis(timezoneOffset)
            .compareTo(new LocalTime(o.startingHour).plusMillis(timezoneOffset));
    }
}
