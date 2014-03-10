package models.questions;

import models.*;
import models.answers.AbstractAnswer;

import javax.persistence.*;
import java.util.List;

/**
 * Created by avainik on 3/6/14.
 */
@Entity
@Inheritance(strategy=InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name="question_type",  discriminatorType=DiscriminatorType.STRING)
@Table(name="question")

/*
 * For some weird reason this class cannot be abstract (Ebean issue) even tough it should
 * Abstract class cannot have Lists
 * 
 * See:
 * https://groups.google.com/forum/#!topic/play-framework/YOSLdmv_oSc
 */
public class AbstractQuestion extends SitnetModel{

    protected String type;

    protected String question;

    protected boolean shared;

    protected String instruction;

    /*
     * If question is edited (correcting a spelling mistake)
     * inplace in an active exam (question is used in an exam that has been published)
     * We create a new instance of this question.
     * This attribute points to old question, so that we could keep
     * track of different versions.
     * This attribute might have use in statistics.
     */
    @OneToOne
    protected AbstractQuestion derivedFromQuestion;

    @OneToOne
    protected AbstractAnswer answer;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy="question")
    protected List<EvaluationCriteria> evaluationCriterias;
    
    //    attachments, images, Videos, documents
    @OneToMany(cascade = CascadeType.PERSIST, mappedBy="question")
    protected List<Material> materials;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy="question")
    protected List<EvaluationPhrase> evaluationPhrases;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy="question")
    protected List<Comment> comments;

    /*
    A question can be a prototype (in a question bank) and it can be used in an Exam
    If it is, then we need to create a copy of it.
    But then we have a duplicate (same content, different id)
    How to prevent showing same question N times in question bank?

    We create a hash oq question attributes:
    - question
    - options
    - etc

    Now we have a unique key to distinguish questions by content.
    Each question type should have its own hash generation logic.

     */
    @Column(length=32)
    protected String hash;

	public String getType() {
		return type;
	}

	public void setType(String type) {
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

	public String getInstruction() {
		return instruction;
	}

	public void setInstruction(String instruction) {
		this.instruction = instruction;
	}

	public AbstractQuestion getDerivedFromQuestion() {
		return derivedFromQuestion;
	}

	public void setDerivedFromQuestion(AbstractQuestion derivedFromQuestion) {
		this.derivedFromQuestion = derivedFromQuestion;
	}

    public AbstractAnswer getAnswer() {
        return answer;
    }

    public void setAnswer(AbstractAnswer answer) {
        this.answer = answer;
    }

    public List<EvaluationCriteria> getEvaluationCriterias() {
		return evaluationCriterias;
	}

	public void setEvaluationCriterias(List<EvaluationCriteria> evaluationCriterias) {
		this.evaluationCriterias = evaluationCriterias;
	}

	public List<Material> getMaterials() {
		return materials;
	}

	public void setMaterials(List<Material> materials) {
		this.materials = materials;
	}

	public List<EvaluationPhrase> getEvaluationPhrases() {
		return evaluationPhrases;
	}

	public void setEvaluationPhrases(List<EvaluationPhrase> evaluationPhrases) {
		this.evaluationPhrases = evaluationPhrases;
	}

	public List<Comment> getComments() {
		return comments;
	}

	public void setComments(List<Comment> comments) {
		this.comments = comments;
	}

	public String getHash() {
		return hash;
	}

	public void setHash(String hash) {
		this.hash = hash;
	}

	@Override
	public String toString() {
		return "AbstractQuestion [type=" + type + ", question=" + question
				+ ", shared=" + shared + ", instruction=" + instruction
				+ ", derivedFromQuestion=" + derivedFromQuestion
				+ ", evaluationCriterias=" + evaluationCriterias + ", hash="
				+ hash + "]";
	}


}
