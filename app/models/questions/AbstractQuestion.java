package models.questions;

import annotations.NonCloneable;
import models.Attachment;
import models.Comment;
import models.EvaluationPhrase;
import models.SitnetModel;
import models.answers.AbstractAnswer;
import util.SitnetUtil;

import javax.persistence.*;

/**
 * Created by avainik on 3/6/14.
 */
@Entity
@Table(name = "question")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "question_type", discriminatorType = DiscriminatorType.STRING)
/*
 * For some weird reason this class cannot be abstract (Ebean issue) even tough it should
 * Abstract class cannot have Lists
 * 
 * See:
 * https://groups.google.com/forum/#!topic/play-framework/YOSLdmv_oSc
 */
abstract public class AbstractQuestion extends SitnetModel {

    protected String type;

    @Column(columnDefinition = "TEXT")
    protected String question;

    protected boolean shared;

    protected String instruction;

    protected String state;

    @Column(columnDefinition="numeric default 0")
    protected Double maxScore = 0.0;

    @Column(columnDefinition="numeric default 0")
    protected Double evaluatedScore;

    /*
     * If question is edited (correcting a spelling mistake)
     * inplace in an active exam (question is used in an exam that has been published)
     * We create a new instance of this question.
     * This attribute points to old question, so that we could keep
     * track of different versions.
     * This attribute might have use in statistics.
     */
    @OneToOne(cascade = CascadeType.PERSIST) // do not delete parent question
    @NonCloneable
    protected AbstractQuestion parent;

    @OneToOne (cascade = CascadeType.ALL)
    protected AbstractAnswer answer;

    @Column(columnDefinition = "TEXT")
    protected String evaluationCriterias;

    //    @OneToMany(cascade = CascadeType.ALL, mappedBy="question")
    //    @ManyToMany(cascade = CascadeType.PERSIST)
//    @OneToOne
    //    protected List<EvaluationCriteria> evaluationCriterias;

    //    attachments, images, Videos, documents
    @OneToOne(cascade = CascadeType.ALL)
    protected Attachment attachment;

    @OneToOne(cascade = CascadeType.ALL)
    protected EvaluationPhrase evaluationPhrases;

    @OneToOne(cascade = CascadeType.ALL)
    @NonCloneable
    protected Comment comments;

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
    @Column(length = 32)
    protected String hash;

    // In UI, section has been expanded
    @Column(columnDefinition="boolean default false")
    private boolean expanded;


    public String getState() { return state; }

    public void setState(String state) {
        this.state = state;
    }

    public String getType() { return type; }

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

    public AbstractQuestion getParent() {
        return parent;
    }

    public void setParent(AbstractQuestion parent) {
        this.parent = parent;
    }

    public AbstractAnswer getAnswer() {
        return answer;
    }

    public void setAnswer(AbstractAnswer answer) {
        this.answer = answer;
    }

    public String getEvaluationCriterias() {
        return evaluationCriterias;
    }

    public void setEvaluationCriterias(String evaluationCriterias) {
        this.evaluationCriterias = evaluationCriterias;
    }

    public Attachment getAttachment() {
        return attachment;
    }

    public void setAttachment(Attachment attachment) {
        this.attachment = attachment;
    }

    public EvaluationPhrase getEvaluationPhrases() {
        return evaluationPhrases;
    }

    public void setEvaluationPhrases(EvaluationPhrase evaluationPhrases) {
        this.evaluationPhrases = evaluationPhrases;
    }

    public Comment getComments() {
        return comments;
    }

    public void setComments(Comment comments) {
        this.comments = comments;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(boolean expanded) {
        this.expanded = expanded;
    }

    public Double getMaxScore() {
        return maxScore;
    }

    public void setMaxScore(Double maxScore) {
        this.maxScore = maxScore;
    }

    public Double getEvaluatedScore() {
        return evaluatedScore;
    }

    public void setEvaluatedScore(Double evaluatedScore) {
        this.evaluatedScore = evaluatedScore;
    }

    public AbstractQuestion getAncestor(AbstractQuestion abstractQuestion) {
        if(abstractQuestion.getParent() == null) {
            return abstractQuestion;
        } else {
            return abstractQuestion.getAncestor(this.getParent());
        }
    }

	@Override
    public Object clone() {

        return SitnetUtil.getClone(this);
    }
	
   	@Override
    public String toString() {
        return "AbstractQuestion [type=" + type + ", question=" + question
                + ", shared=" + shared + ", instruction=" + instruction
                + ", parent=" + parent
                + ", evaluationCriterias=" + evaluationCriterias + ", hash="
                + hash + "]";
    }

}
