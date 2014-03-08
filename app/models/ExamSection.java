package models;

import java.util.List;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToMany;

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

	@ManyToMany(cascade = CascadeType.PERSIST)
	private List<AbstractQuestion> questions;

//	@ManyToOne
//	@ManyToMany
//	private Exam exam;

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

    @Override
    public String toString() {
        return "ExamSection{" +
                "name='" + name + '\'' +
                ", questions=" + questions +
                ", totalScore=" + totalScore +
                '}';
    }
}
