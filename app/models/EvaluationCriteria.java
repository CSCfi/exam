package models;

import javax.persistence.Entity;

@Entity
public class EvaluationCriteria extends SitnetModel {

	
	
	private String criteria;

	public EvaluationCriteria(User creator, String criteria) {
		super(creator);
		this.criteria = criteria;
	}



}
