package models;

import javax.persistence.Entity;

@Entity
public class SNEvaluationPhrase extends SNModel {


	private String phrase;
	
	public SNEvaluationPhrase(User creator, String mimeType, String phrase) {
		super(creator, mimeType);
		this.phrase = phrase;
	}

}
