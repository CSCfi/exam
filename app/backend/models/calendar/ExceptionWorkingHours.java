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

package backend.models.calendar;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonFormat;
import backend.models.ExamRoom;
import backend.models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import java.util.Date;

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

    private boolean massEdited;

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

    public void setMassEdited(boolean massEdited) {this.massEdited = massEdited; }

    public boolean getMassEdited() {return massEdited;}

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ExceptionWorkingHours)) {
            return false;
        }
        ExceptionWorkingHours otherException = (ExceptionWorkingHours) other;
        return new EqualsBuilder().append(id, otherException.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }
}
