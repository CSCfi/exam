package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import java.util.Date;

@Entity
public class ExaminationDate extends GeneratedIdentityModel {

    @Temporal(TemporalType.TIMESTAMP)
    private Date date;

    @ManyToOne
    @JsonBackReference
    private Exam exam;

    public Date getDate() {
        return date;
    }

    public void setDate(Date date) {
        this.date = date;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ExaminationDate)) {
            return false;
        }
        ExaminationDate otherException = (ExaminationDate) other;
        return new EqualsBuilder().append(id, otherException.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }
}
