package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.questions.AbstractQuestion;
import util.SitnetUtil;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/*
 * Tenttiosio, joka voi sisältää useita kysymyksiä (Kysymystyyppejä)
 * ryhmitää tentin kysymykset.
 * 
 *  Tentti sisältää ainakin yhden osion. 
 * 
 */
@Entity
public class ExamSection extends SitnetModel {

    private String name;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "examSection")
    @JsonManagedReference
    private List<ExamSectionQuestion> sectionQuestions = new ArrayList<>();

    @ManyToOne
    @JsonBackReference
    private Exam exam;

    // osion kokonaispisteet
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

    public boolean containsQuestion(AbstractQuestion question) {

        for (ExamSectionQuestion esq : getSectionQuestions()) {
            if (esq.getQuestion().getParent() != null && esq.getQuestion().getParent().equals(question)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public Object clone() {

        return SitnetUtil.getClone(this);
    }

    @Override
    public String toString() {
        return "ExamSection{" +
                "name='" + name + '\'' +
                ", totalScore=" + totalScore +
                '}';
    }
}
