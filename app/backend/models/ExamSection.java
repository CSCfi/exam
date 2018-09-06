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

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Nonnull;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.Transient;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import org.springframework.beans.BeanUtils;

import backend.models.api.Sortable;
import backend.models.base.OwnedModel;
import backend.models.questions.Question;

@Entity
public final class ExamSection extends OwnedModel implements Comparable<ExamSection>, Sortable {

    private String name;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "examSection")
    @JsonManagedReference
    private Set<ExamSectionQuestion> sectionQuestions;

    @ManyToOne
    @JsonBackReference
    private Exam exam;

    private Integer sequenceNumber;

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    private boolean expanded;

    // Are questions in this section lotteried
    @Column(columnDefinition = "boolean default false")
    private boolean lotteryOn;

    private int lotteryItemCount;

    private String description;

    public Set<ExamSectionQuestion> getSectionQuestions() {
        return sectionQuestions;
    }

    public void setSectionQuestions(Set<ExamSectionQuestion> sectionQuestions) {
        this.sectionQuestions = sectionQuestions;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }

    public Integer getSequenceNumber() {
        return sequenceNumber;
    }

    public void setSequenceNumber(Integer sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }

    public boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(boolean expanded) {
        this.expanded = expanded;
    }

    public boolean getLotteryOn() {
        return lotteryOn;
    }

    public void setLotteryOn(boolean lotteryOn) {
        this.lotteryOn = lotteryOn;
    }

    public int getLotteryItemCount() {
        return lotteryItemCount;
    }

    public void setLotteryItemCount(int lotteryItemCount) {
        this.lotteryItemCount = lotteryItemCount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void shuffleQuestions() {
        List<ExamSectionQuestion> questions = new ArrayList<>(sectionQuestions);
        Collections.shuffle(questions);
        sectionQuestions = new HashSet<>(questions.subList(0, lotteryItemCount));
    }

    public ExamSection copyWithAnswers(Exam exam) {
        ExamSection section = new ExamSection();
        BeanUtils.copyProperties(this, section, "id", "exam", "sectionQuestions");
        section.setExam(exam);
        for (ExamSectionQuestion esq : sectionQuestions) {
            section.getSectionQuestions().add(esq.copyWithAnswers());
        }
        return section;
    }

    public ExamSection copy(Exam exam, boolean produceStudentExamSection, boolean setParents)
    {
        ExamSection section = new ExamSection();
        BeanUtils.copyProperties(this, section, "id", "exam", "sectionQuestions");
        section.setExam(exam);
        for (ExamSectionQuestion esq : sectionQuestions) {
            section.getSectionQuestions().add(esq.copy(!produceStudentExamSection, setParents));
        }
        if (produceStudentExamSection && lotteryOn) {
            section.shuffleQuestions();
        }
        return section;
    }

    @Transient
    double getTotalScore() {
        return sectionQuestions.stream()
                .map(ExamSectionQuestion::getAssessedScore)
                .filter(Objects::nonNull)
                .reduce(0.0, (sum, x) -> sum += x);
    }

    @Transient
    double getMaxScore() {
        return sectionQuestions.stream()
                .map(ExamSectionQuestion::getMaxAssessedScore)
                .filter(Objects::nonNull)
                .reduce(0.0, (sum, x) -> sum += x);
    }

    @Transient
    int getRejectedCount() {
        return sectionQuestions.stream()
                .filter(ExamSectionQuestion::isRejected)
                .collect(Collectors.toList()).size();
    }

    @Transient
    int getApprovedCount() {
        return sectionQuestions.stream()
                .filter(ExamSectionQuestion::isApproved)
                .collect(Collectors.toList()).size();
    }

    @Transient
    public boolean hasQuestion(Question question) {
        return sectionQuestions.stream().map(ExamSectionQuestion::getQuestion).anyMatch(q -> q.equals(question));
    }


    @Override
    public int compareTo(@Nonnull ExamSection o) {
        return sequenceNumber - o.sequenceNumber;
    }

    @Override
    public Integer getOrdinal() {
        return sequenceNumber;
    }

    @Override
    public void setOrdinal(Integer ordinal) {
        sequenceNumber = ordinal;
    }

}
