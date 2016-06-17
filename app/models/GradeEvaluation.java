package models;

import models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.Transient;


@Entity
public class GradeEvaluation extends GeneratedIdentityModel {

    @ManyToOne
    private AutoEvaluationConfig autoEvaluationConfig;

    @ManyToOne
    private Grade grade;

    private Integer percentage;

    public AutoEvaluationConfig getAutoEvaluationConfig() {
        return autoEvaluationConfig;
    }

    public void setAutoEvaluationConfig(AutoEvaluationConfig autoEvaluationConfig) {
        this.autoEvaluationConfig = autoEvaluationConfig;
    }

    public Grade getGrade() {
        return grade;
    }

    public void setGrade(Grade grade) {
        this.grade = grade;
    }

    public Integer getPercentage() {
        return percentage;
    }

    public void setPercentage(Integer percentage) {
        this.percentage = percentage;
    }

    @Transient
    public GradeEvaluation copy() {
        GradeEvaluation clone = new GradeEvaluation();
        BeanUtils.copyProperties(this, clone, "id");
        return clone;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof GradeEvaluation)) {
            return false;
        }
        GradeEvaluation otherEvaluation = (GradeEvaluation) other;
        return new EqualsBuilder().append(grade, otherEvaluation.grade).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(grade).build();
    }

}
