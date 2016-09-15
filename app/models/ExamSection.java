package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.api.Sortable;
import models.base.OwnedModel;
import models.questions.Question;
import org.springframework.beans.BeanUtils;

import javax.annotation.Nonnull;
import javax.persistence.*;
import java.util.*;
import java.util.stream.Collectors;

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

    ExamSection copy(Exam exam, boolean produceStudentExamSection)
    {
        ExamSection section = new ExamSection();
        BeanUtils.copyProperties(this, section, "id", "exam", "sectionQuestions");
        section.setExam(exam);
        for (ExamSectionQuestion esq : sectionQuestions) {
            section.getSectionQuestions().add(esq.copy(!produceStudentExamSection));
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
                .filter(s -> s != null)
                .reduce(0.0, (sum, x) -> sum += x);
    }

    @Transient
    double getMaxScore() {
        return sectionQuestions.stream()
                .map(ExamSectionQuestion::getMaxAssessedScore)
                .filter(s -> s != null)
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
