package models.calendar;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.Entity;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import models.base.GeneratedIdentityModel;
import org.joda.time.DateTime;
import util.datetime.DateTimeAdapter;

@Entity
public class MaintenancePeriod extends GeneratedIdentityModel {

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime startsAt;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime endsAt;

    private String description;

    public DateTime getStartsAt() {
        return startsAt;
    }

    public void setStartsAt(DateTime start) {
        this.startsAt = start;
    }

    public DateTime getEndsAt() {
        return endsAt;
    }

    public void setEndsAt(DateTime end) {
        this.endsAt = end;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
