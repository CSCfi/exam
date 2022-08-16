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

import com.fasterxml.jackson.annotation.JsonBackReference;
import io.ebean.annotation.EnumValue;
import java.util.Date;
import javax.persistence.Entity;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

@Entity
public class ExamFeedbackConfig extends GeneratedIdentityModel {

    public enum ReleaseType {
        @EnumValue("1")
        ONCE_LOCKED,
        @EnumValue("2")
        AFTER_EXAM_PERIOD,
        @EnumValue("3")
        GIVEN_DATE,
    }

    private ReleaseType releaseType;

    @OneToOne
    @JsonBackReference
    private Exam exam;

    @Temporal(TemporalType.TIMESTAMP)
    private Date releaseDate;

    public ReleaseType getReleaseType() {
        return releaseType;
    }

    public void setReleaseType(ReleaseType releaseType) {
        this.releaseType = releaseType;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }

    public Date getReleaseDate() {
        return releaseDate;
    }

    public void setReleaseDate(Date releaseDate) {
        this.releaseDate = releaseDate;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ExamFeedbackConfig)) {
            return false;
        }
        ExamFeedbackConfig otherConfig = (ExamFeedbackConfig) other;
        return new EqualsBuilder().append(id, otherConfig.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }
}
