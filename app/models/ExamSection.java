package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.questions.AbstractQuestion;
import util.SitnetUtil;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
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

	@ManyToMany(cascade = CascadeType.ALL)
	@JsonManagedReference
	private List<AbstractQuestion> questions;

	@ManyToOne
	@JsonBackReference
	private Exam exam;

	// osion kokonaispisteet
	private Long totalScore;

    // In UI, section has been expanded
    private Boolean expanded;

    // Are questions in this section lotteried
    private Boolean lotteryOn;

    private int lotteryItemCount;

	public List<AbstractQuestion> getQuestions() {
		return questions;
	}

	public void setQuestions(List<AbstractQuestion> questions) {
		this.questions = questions;
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

    public Boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(Boolean expanded) {
        this.expanded = expanded;
    }

    public Boolean getLotteryOn() {
        return lotteryOn;
    }

    public void setLotteryOn(Boolean lotteryOn) {
        this.lotteryOn = lotteryOn;
    }

    public int getLotteryItemCount() {
        return lotteryItemCount;
    }

    public void setLotteryItemCount(int lotteryItemCount) {
        this.lotteryItemCount = lotteryItemCount;
    }

    @Override
    public Object clone() {

        return SitnetUtil.getClone(this);
    }
	
    @Override
    public String toString() {
        return "ExamSection{" +
                "name='" + name + '\'' +
                ", questions=" + questions +
                ", totalScore=" + totalScore +
                '}';
    }
}
