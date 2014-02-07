package models;

import javax.persistence.Entity;

@Entity
public class SNEvaluationCriteria extends SNModel {

	
	
	private String criteria;

	public SNEvaluationCriteria(User creator, String mimeType, String criteria) {
		super(creator, mimeType);
		this.criteria = criteria;
	}



}
