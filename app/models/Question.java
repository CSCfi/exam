package models;

import java.util.List;

import javax.persistence.Entity;

@Entity
public class Question extends SitnetModel {

	
	
	private boolean shared;
	
	private List<Material> materials;
	
	private List<Answer> answers;

	private List<EvaluationPhrase> evaluationPhrases;

	private List<EvaluationCriteria> evaluationCriterias;
	
	private List<Comment> comments;
	
	
	public Question(User creator, String mimeType) {
		super(creator, mimeType);
	}
	
	
	
	

}
