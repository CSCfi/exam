// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.sections;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import models.base.GeneratedIdentityModel;
import models.questions.MultipleChoiceOption;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

@Entity
public class ExamSectionQuestionOption extends GeneratedIdentityModel {

    @ManyToOne
    @JsonBackReference
    private ExamSectionQuestion examSectionQuestion;

    @ManyToOne
    private MultipleChoiceOption option;

    private boolean answered;

    @Column
    private Double score;

    public ExamSectionQuestion getExamSectionQuestion() {
        return examSectionQuestion;
    }

    public void setExamSectionQuestion(ExamSectionQuestion examSectionQuestion) {
        this.examSectionQuestion = examSectionQuestion;
    }

    public MultipleChoiceOption getOption() {
        return option;
    }

    public void setOption(MultipleChoiceOption option) {
        this.option = option;
    }

    public boolean isAnswered() {
        return answered;
    }

    public void setAnswered(boolean answered) {
        this.answered = answered;
    }

    public Double getScore() {
        return score;
    }

    public void setScore(Double score) {
        this.score = score;
    }

    ExamSectionQuestionOption copy() {
        ExamSectionQuestionOption esqo = new ExamSectionQuestionOption();
        esqo.setOption(option);
        esqo.setScore(score);
        return esqo;
    }

    ExamSectionQuestionOption copyWithAnswer() {
        ExamSectionQuestionOption esqo = new ExamSectionQuestionOption();
        esqo.setOption(option);
        esqo.setScore(score);
        esqo.setAnswered(answered);
        return esqo;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ExamSectionQuestionOption otherOption)) {
            return false;
        }
        return new EqualsBuilder().append(option, otherOption.option).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(option).build();
    }
}
