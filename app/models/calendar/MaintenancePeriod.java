// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.calendar;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.Entity;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import miscellaneous.datetime.DateTimeAdapter;
import models.base.GeneratedIdentityModel;
import org.joda.time.DateTime;

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
