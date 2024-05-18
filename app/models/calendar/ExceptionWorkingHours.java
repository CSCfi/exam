// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.calendar;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import java.util.Date;
import models.ExamRoom;
import models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

@Entity
public class ExceptionWorkingHours extends GeneratedIdentityModel {

    @Temporal(TemporalType.TIMESTAMP)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mmZ")
    private Date startDate;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mmZ")
    private Date endDate;

    private int startDateTimezoneOffset;

    private int endDateTimezoneOffset;

    private boolean outOfService;

    @ManyToOne
    @JsonBackReference
    private ExamRoom room;

    public Date getEndDate() {
        return endDate;
    }

    public void setEndDate(Date endDate) {
        this.endDate = endDate;
    }

    public ExamRoom getRoom() {
        return room;
    }

    public void setRoom(ExamRoom room) {
        this.room = room;
    }

    public Date getStartDate() {
        return startDate;
    }

    public void setStartDate(Date startDate) {
        this.startDate = startDate;
    }

    public int getStartDateTimezoneOffset() {
        return startDateTimezoneOffset;
    }

    public void setStartDateTimezoneOffset(int startDateTimezoneOffset) {
        this.startDateTimezoneOffset = startDateTimezoneOffset;
    }

    public int getEndDateTimezoneOffset() {
        return endDateTimezoneOffset;
    }

    public void setEndDateTimezoneOffset(int endTimeTimezoneOffset) {
        this.endDateTimezoneOffset = endTimeTimezoneOffset;
    }

    public boolean isOutOfService() {
        return outOfService;
    }

    public void setOutOfService(boolean outOfService) {
        this.outOfService = outOfService;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ExceptionWorkingHours otherException)) {
            return false;
        }
        return new EqualsBuilder().append(id, otherException.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }
}
