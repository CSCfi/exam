package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import org.springframework.beans.BeanUtils;

import javax.persistence.*;
import java.util.*;
import java.util.stream.Collectors;

@Entity
public final class ExamSection extends OwnedModel {

    private String name;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "examSection")
    @JsonManagedReference
    private Set<ExamSectionQuestion> sectionQuestions;

    @ManyToOne
    @JsonBackReference
    private Exam exam;

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    private boolean expanded;

    // Are questions in this section lotteried
    @Column(columnDefinition = "boolean default false")
    private boolean lotteryOn;

    private int lotteryItemCount;

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

    public void shuffleQuestions() {
        List<ExamSectionQuestion> questions = new ArrayList<>(sectionQuestions);
        Collections.shuffle(questions);
        sectionQuestions = new HashSet<>(questions.subList(0, lotteryItemCount));
    }
	
    public ExamSection copy(Exam exam, boolean produceStudentExamSection)
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
    public double getTotalScore() {
        return sectionQuestions.stream()
                .map(sq -> sq.getQuestion().getAssessedScore())
                .reduce(0.0, (sum, x) -> sum += x);
    }

    @Transient
    public double getMaxScore() {
        return sectionQuestions.stream()
                .map(sq -> sq.getQuestion().getMaxAssessedScore())
                .reduce(0.0, (sum, x) -> sum += x);
    }

    @Transient
    public int getRejectedCount() {
        return sectionQuestions.stream()
                .filter(sq -> sq.getQuestion().isRejected())
                .collect(Collectors.toList()).size();
    }

    @Transient
    public int getApprovedCount() {
        return sectionQuestions.stream()
                .filter(sq -> sq.getQuestion().isApproved())
                .collect(Collectors.toList()).size();
    }
}
