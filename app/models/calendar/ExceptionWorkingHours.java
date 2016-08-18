package models.calendar;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonFormat;
import models.Exam;
import models.ExamRoom;
import models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.*;
import java.util.Date;

@Entity
@DiscriminatorValue("ExceptionWorkingHours")
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
