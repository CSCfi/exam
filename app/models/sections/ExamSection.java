// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.sections;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import javax.annotation.Nonnull;
import models.base.OwnedModel;
import models.enrolment.ExamEnrolment;
import models.exam.Exam;
import models.questions.Question;
import models.user.User;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;

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

    private boolean expanded;

    private boolean lotteryOn;

    private boolean optional;

    private int lotteryItemCount;

    private String description;

    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(
        name = "exam_section_material",
        joinColumns = @JoinColumn(name = "exam_section_id"),
        inverseJoinColumns = @JoinColumn(name = "exam_material_id")
    )
    private Set<ExamMaterial> examMaterials;

    @ManyToMany(mappedBy = "optionalSections", cascade = CascadeType.ALL)
    private Set<ExamEnrolment> examEnrolments;

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

    public boolean isExpanded() {
        return expanded;
    }

    public void setExpanded(boolean expanded) {
        this.expanded = expanded;
    }

    public boolean isLotteryOn() {
        return lotteryOn;
    }

    public void setLotteryOn(boolean lotteryOn) {
        this.lotteryOn = lotteryOn;
    }

    public boolean isOptional() {
        return optional;
    }

    public void setOptional(boolean optional) {
        this.optional = optional;
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

    public Set<ExamMaterial> getExamMaterials() {
        return examMaterials;
    }

    public void setExamMaterials(Set<ExamMaterial> examMaterials) {
        this.examMaterials = examMaterials;
    }

    public Set<ExamEnrolment> getExamEnrolments() {
        return examEnrolments;
    }

    public void setExamEnrolments(Set<ExamEnrolment> enrolments) {
        this.examEnrolments = enrolments;
    }

    public void shuffleQuestions() {
        List<ExamSectionQuestion> questions = new ArrayList<>(sectionQuestions);
        Collections.shuffle(questions);
        sectionQuestions = new HashSet<>(questions.subList(0, lotteryItemCount));
    }

    public ExamSection copyWithAnswers(Exam exam, boolean hasParent) {
        ExamSection section = new ExamSection();
        BeanUtils.copyProperties(this, section, "id", "exam", "sectionQuestions");
        section.setExam(exam);
        for (ExamSectionQuestion esq : sectionQuestions) {
            section.getSectionQuestions().add(esq.copyWithAnswers(hasParent));
        }
        return section;
    }

    public ExamSection copy(Exam exam, boolean produceStudentExamSection, boolean setParents, User user) {
        ExamSection section = new ExamSection();
        BeanUtils.copyProperties(this, section, "id", "exam", "sectionQuestions", "examMaterials");
        section.setExam(exam);
        for (ExamSectionQuestion esq : sectionQuestions) {
            ExamSectionQuestion esqCopy = esq.copy(!produceStudentExamSection, setParents);
            esqCopy.setCreatorWithDate(user);
            esqCopy.setModifierWithDate(user);
            section.getSectionQuestions().add(esqCopy);
        }
        if (produceStudentExamSection) {
            for (ExamMaterial em : examMaterials) {
                ExamMaterial emCopy = em.copy(user);
                emCopy.save();
                section.getExamMaterials().add(emCopy);
            }
        } else {
            section.setExamMaterials(examMaterials);
        }
        if (produceStudentExamSection && lotteryOn) {
            section.shuffleQuestions();
        }
        return section;
    }

    public double getTotalScore() {
        return sectionQuestions
            .stream()
            .map(ExamSectionQuestion::getAssessedScore)
            .filter(Objects::nonNull)
            .reduce(0.0, Double::sum);
    }

    public double getMaxScore() {
        return sectionQuestions
            .stream()
            .map(ExamSectionQuestion::getMaxAssessedScore)
            .filter(Objects::nonNull)
            .reduce(0.0, Double::sum);
    }

    public int getRejectedCount() {
        return (int) sectionQuestions.stream().filter(ExamSectionQuestion::isRejected).count();
    }

    public int getApprovedCount() {
        return (int) sectionQuestions.stream().filter(ExamSectionQuestion::isApproved).count();
    }

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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ExamSection that)) return false;
        return new EqualsBuilder().append(id, that.id).isEquals();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder(17, 37).append(id).toHashCode();
    }
}
