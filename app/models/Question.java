package models;

import java.util.List;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToMany;
import javax.persistence.OneToMany;

@Entity
public class Question extends SitnetModel {

	public static enum QuestionType {

		MULTIPLE_CHOISE_ONE_CORRECT, 
		MULTIPLE_CHOISE_SEVERAL_CORRECT, 
		ESSAY,

	}

	private QuestionType type;

	private String question;

	private boolean shared;

	@OneToMany(cascade = CascadeType.ALL)
	private List<Material> materials;

	@OneToMany(cascade = CascadeType.ALL)
	private List<Answer> answers;

	@OneToMany(cascade = CascadeType.ALL)
	private List<EvaluationPhrase> evaluationPhrases;

	@ManyToMany(cascade = CascadeType.ALL)
	private List<EvaluationCriteria> evaluationCriterias;

	@OneToMany(cascade = CascadeType.ALL)
	private List<Comment> comments;

	@OneToMany(cascade = CascadeType.ALL)
	private List<MultipleChoiseOption> options;

	
	
	public QuestionType getType() {
		return type;
	}

	public void setType(QuestionType type) {
		this.type = type;
	}

	public String getQuestion() {
		return question;
	}

	public void setQuestion(String question) {
		this.question = question;
	}

	public boolean isShared() {
		return shared;
	}

	public void setShared(boolean shared) {
		this.shared = shared;
	}

	public List<Material> getMaterials() {
		return materials;
	}

	public void setMaterials(List<Material> materials) {
		this.materials = materials;
	}

	public List<Answer> getAnswers() {
		return answers;
	}

	public void setAnswers(List<Answer> answers) {
		this.answers = answers;
	}

	public List<EvaluationPhrase> getEvaluationPhrases() {
		return evaluationPhrases;
	}

	public void setEvaluationPhrases(List<EvaluationPhrase> evaluationPhrases) {
		this.evaluationPhrases = evaluationPhrases;
	}

	public List<EvaluationCriteria> getEvaluationCriterias() {
		return evaluationCriterias;
	}

	public void setEvaluationCriterias(
			List<EvaluationCriteria> evaluationCriterias) {
		this.evaluationCriterias = evaluationCriterias;
	}

	public List<Comment> getComments() {
		return comments;
	}

	public void setComments(List<Comment> comments) {
		this.comments = comments;
	}

	public List<MultipleChoiseOption> getOptions() {
		return options;
	}

	public void setOptions(List<MultipleChoiseOption> options) {
		this.options = options;
	}

}
