// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;

@Entity
public class GradeEvaluation extends GeneratedIdentityModel {

    @ManyToOne
    @JsonBackReference
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

    public GradeEvaluation copy() {
        GradeEvaluation clone = new GradeEvaluation();
        BeanUtils.copyProperties(this, clone, "id");
        return clone;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof GradeEvaluation otherEvaluation)) {
            return false;
        }
        return new EqualsBuilder().append(grade, otherEvaluation.grade).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(grade).build();
    }
}
