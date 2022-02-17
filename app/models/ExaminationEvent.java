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

package models;

import javax.persistence.Entity;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
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

    @Transient
    public Interval toInterval(Exam exam) {
        return new Interval(start, start.plusMinutes(exam.getDuration()));
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ExaminationEvent)) {
            return false;
        }
        ExaminationEvent otherException = (ExaminationEvent) other;
        return new EqualsBuilder().append(id, otherException.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }
}
