package models;

import javax.persistence.Entity;

@Entity
public class EvaluationCriteria extends SitnetModel {

	
	
	private String criteria;

	public EvaluationCriteria(User creator, String mimeType, String criteria) {
		super(creator, mimeType);
		this.criteria = criteria;
	}



}
