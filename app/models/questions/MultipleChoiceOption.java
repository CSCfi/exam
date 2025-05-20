// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions;

import com.fasterxml.jackson.annotation.JsonBackReference;
import io.ebean.annotation.EnumValue;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import java.util.Set;
import javax.validation.constraints.NotNull;
import models.base.GeneratedIdentityModel;
import models.sections.ExamSectionQuestionOption;
import org.springframework.beans.BeanUtils;

@Entity
public class MultipleChoiceOption extends GeneratedIdentityModel implements Comparable<MultipleChoiceOption> {

    public enum ClaimChoiceOptionType {
        @EnumValue("1")
        CorrectOption,
        @EnumValue("2")
        IncorrectOption,
        @EnumValue("3")
        SkipOption,
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

    public boolean isLegitMaxScore() {
        return defaultScore != null && defaultScore > 0;
    }

    public boolean isLegitMinScore(boolean allowNegative) {
        if (defaultScore == null || !allowNegative) {
            return false;
        }
        return defaultScore < 0;
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
