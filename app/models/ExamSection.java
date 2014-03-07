package models;

import models.questions.AbstractQuestion;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToMany;
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

	@ManyToMany(cascade = CascadeType.REMOVE)
	private List<AbstractQuestion> questions;

//	@ManyToOne
	@ManyToMany
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

	public Exam getExam() {
		return exam;
	}

	public void setExam(Exam exam) {
		this.exam = exam;
	}

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return "ExamSection{" +
                "name='" + name + '\'' +
                ", questions=" + questions +
                ", exam=" + exam +
                ", totalScore=" + totalScore +
                '}';
    }
}
