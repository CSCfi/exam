package models;

import java.util.List;

import javax.persistence.Entity;

@Entity
public class SNQuestion extends SNModel {

	
	
	private boolean shared;
	
	private List<SNMaterial> materials;
	
	private List<SNAnswer> answers;

	private List<SNEvaluationPhrase> evaluationPhrases;

	private List<SNEvaluationCriteria> evaluationCriterias;
	
	private List<SNComment> comments;
	
	
	public SNQuestion(User creator, String mimeType) {
		super(creator, mimeType);
	}
	
	
	
	

}
