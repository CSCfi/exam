package models;

import models.questions.AbstractQuestion;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;

@Entity
public class EvaluationCriteria extends SitnetModel {

	@ManyToOne(cascade = CascadeType.PERSIST)
	private AbstractQuestion question;
	
	@Column(length=512)
	private String criteria;

	public String getCriteria() {
		return criteria;
	}

	public void setCriteria(String criteria) {
		this.criteria = criteria;
	}

}
