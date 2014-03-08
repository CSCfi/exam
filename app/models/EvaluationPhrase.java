package models;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;

import models.questions.AbstractQuestion;

@Entity
public class EvaluationPhrase extends SitnetModel {

	@ManyToOne(cascade = CascadeType.PERSIST)
	private AbstractQuestion question;
	
	@Column(length=512)
    private String phrase;

	public String getPhrase() {
		return phrase;
	}

	public void setPhrase(String phrase) {
		this.phrase = phrase;
	}


}
