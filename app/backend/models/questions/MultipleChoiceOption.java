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

package backend.models.questions;

import backend.models.base.GeneratedIdentityModel;
import backend.models.sections.ExamSectionQuestionOption;
import com.fasterxml.jackson.annotation.JsonBackReference;
import io.ebean.annotation.EnumValue;
import java.util.Set;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.validation.constraints.NotNull;
import org.springframework.beans.BeanUtils;

@Entity
public class MultipleChoiceOption extends GeneratedIdentityModel implements Comparable<MultipleChoiceOption> {

    public enum ClaimChoiceOptionType {
        @EnumValue("1")
        CorrectOption,
        @EnumValue("2")
        IncorrectOption,
        @EnumValue("3")
        SkipOption
    }

    private String option;

    private boolean correctOption;

    private Double defaultScore;

    private ClaimChoiceOptionType claimChoiceType;

    @ManyToOne
    @JsonBackReference
    private Question question;

    @OneToMany(cascade = CascadeType.REMOVE, mappedBy = "option")
    @JsonBackReference
    private Set<ExamSectionQuestionOption> examSectionQuestionOptions;

    public String getOption() {
        return option;
    }

    public void setOption(String option) {
        this.option = option;
    }

    public boolean isCorrectOption() {
        return correctOption;
    }

    public void setCorrectOption(boolean correctOption) {
        this.correctOption = correctOption;
    }

    public Double getDefaultScore() {
        return defaultScore;
    }

    public void setDefaultScore(Double defaultScore) {
        this.defaultScore = defaultScore;
    }

    public ClaimChoiceOptionType getClaimChoiceType() {
        return claimChoiceType;
    }

    public void setClaimChoiceType(ClaimChoiceOptionType claimChoiceType) {
        this.claimChoiceType = claimChoiceType;
    }

    public Question getQuestion() {
        return question;
    }

    public void setQuestion(Question question) {
        this.question = question;
    }

    public Set<ExamSectionQuestionOption> getExamSectionQuestionOptions() {
        return examSectionQuestionOptions;
    }

    public void setExamSectionQuestionOptions(Set<ExamSectionQuestionOption> examSectionQuestionOptions) {
        this.examSectionQuestionOptions = examSectionQuestionOptions;
    }

    public MultipleChoiceOption copy() {
        MultipleChoiceOption option = new MultipleChoiceOption();
        BeanUtils.copyProperties(this, option, "id", "examSectionQuestionOptions");
        return option;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }

        MultipleChoiceOption that = (MultipleChoiceOption) o;
        return getId().equals(that.getId());
    }

    @Override
    public int hashCode() {
        int result = super.hashCode();
        if (getId() != null) {
            result = 31 * result + getId().hashCode();
        }
        return result;
    }

    @Override
    public int compareTo(@NotNull MultipleChoiceOption o) {
        if (getId() < o.getId()) {
            return -1;
        }
        return getId().equals(o.getId()) ? 0 : 1;
    }
}
