package models;

import javax.persistence.Column;
import javax.persistence.Entity;

@Entity
public class EvaluationCriteria extends SitnetModel {

	
	@Column(length=512)
	private String criteria;

	public String getCriteria() {
		return criteria;
	}

	public void setCriteria(String criteria) {
		this.criteria = criteria;
	}




}
