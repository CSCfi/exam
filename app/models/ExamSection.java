package models;

import java.util.List;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;

import models.questions.AbstractQuestion;

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

	@OneToMany(cascade = CascadeType.PERSIST, mappedBy = "examSection")

	private List<AbstractQuestion> questions;

	@ManyToOne

	private Exam exam;

	// osion kokonaispisteet
	private Long totalScore;

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

    @Override
    public String toString() {
        return "ExamSection{" +
                "name='" + name + '\'' +
                ", questions=" + questions +
                ", totalScore=" + totalScore +
                '}';
    }
}
