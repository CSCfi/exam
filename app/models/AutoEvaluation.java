package models;

import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;


@Entity
public class AutoEvaluation extends GeneratedIdentityModel {

    @ManyToOne
    private Exam exam;

    @ManyToOne
    private Grade grade;

    private Integer percentage;

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }

    public Integer getPercentage() {
        return percentage;
    }

    public void setPercentage(Integer percentage) {
        this.percentage = percentage;
    }

    public Grade getGrade() {
        return grade;
    }

    public void setGrade(Grade grade) {
        this.grade = grade;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof AutoEvaluation)) {
            return false;
        }
        AutoEvaluation otherEvaluation = (AutoEvaluation) other;
        return new EqualsBuilder().append(id, otherEvaluation.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }

}
