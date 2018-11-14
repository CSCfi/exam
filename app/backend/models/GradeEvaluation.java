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

package backend.models;

import backend.models.base.GeneratedIdentityModel;
import com.fasterxml.jackson.annotation.JsonBackReference;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.Transient;


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
