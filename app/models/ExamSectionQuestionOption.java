/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
import models.base.GeneratedIdentityModel;
import models.questions.MultipleChoiceOption;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;


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
        if (!(other instanceof ExamSectionQuestionOption)) {
            return false;
        }
        ExamSectionQuestionOption otherOption = (ExamSectionQuestionOption) other;
        return new EqualsBuilder()
                .append(option, otherOption.option).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(option).build();
    }

}
