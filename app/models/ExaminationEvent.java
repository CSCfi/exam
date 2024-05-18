// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models;

import jakarta.persistence.Entity;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import org.joda.time.Interval;

@Entity
public class ExaminationEvent extends GeneratedIdentityModel {

    @Temporal(TemporalType.TIMESTAMP)
    private DateTime start;

    private String description;

    private int capacity;

    @OneToOne(mappedBy = "examinationEvent")
    private ExaminationEventConfiguration examinationEventConfiguration;

    public DateTime getStart() {
        return start;
    }

    public void setStart(DateTime start) {
        this.start = start;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getCapacity() {
        return capacity;
    }

    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }

    public ExaminationEventConfiguration getExaminationEventConfiguration() {
        return examinationEventConfiguration;
    }

    public void setExaminationEventConfiguration(ExaminationEventConfiguration examinationEventConfiguration) {
        this.examinationEventConfiguration = examinationEventConfiguration;
    }

    public Interval toInterval(Exam exam) {
        return new Interval(start, start.plusMinutes(exam.getDuration()));
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ExaminationEvent otherException)) {
            return false;
        }
        return new EqualsBuilder().append(id, otherException.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }
}
