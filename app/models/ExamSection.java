package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import org.springframework.beans.BeanUtils;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
public final class ExamSection extends OwnedModel {

    private String name;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "examSection")
    @JsonManagedReference
    private List<ExamSectionQuestion> sectionQuestions = new ArrayList<>();

    @ManyToOne
    @JsonBackReference
    private Exam exam;

    private Long totalScore;

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    private boolean expanded;

    // Are questions in this section lotteried
    @Column(columnDefinition = "boolean default false")
    private boolean lotteryOn;

    private int lotteryItemCount;

    public List<ExamSectionQuestion> getSectionQuestions() {
        return sectionQuestions;
    }

    public void setSectionQuestions(List<ExamSectionQuestion> sectionQuestions) {
        this.sectionQuestions = sectionQuestions;
    }

    public Long getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(Long totalScore) {
        this.totalScore = totalScore;
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
        Collections.shuffle(sectionQuestions);
        sectionQuestions = sectionQuestions.subList(0, lotteryItemCount);
    }

    public ExamSection copy(Exam exam, boolean shuffleQuestions)
    {
        ExamSection section = new ExamSection();
        BeanUtils.copyProperties(this, section, "id", "exam", "sectionQuestions");
        section.setExam(exam);
        for (ExamSectionQuestion esq : sectionQuestions) {
            section.getSectionQuestions().add(esq.copy());
        }
        if (shuffleQuestions && lotteryOn) {
            section.shuffleQuestions();
        }
        return section;
    }

    @Override
    public String toString() {
        return "ExamSection{" +
                "name='" + name + '\'' +
                ", totalScore=" + totalScore +
                '}';
    }
}
