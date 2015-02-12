package models.questions;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.Attachment;
import models.ExamSectionQuestion;
import models.SitnetModel;
import models.answers.AbstractAnswer;
import org.apache.commons.lang3.builder.EqualsBuilder;

import javax.persistence.*;

@Entity
@Table(name = "question")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "question_type", discriminatorType = DiscriminatorType.STRING)
public abstract class AbstractQuestion extends SitnetModel {

    protected String type;

    @Column(columnDefinition = "TEXT")
    protected String question;

    protected boolean shared;

    @Column(columnDefinition = "TEXT")
    protected String instruction;

    protected String state;

    @Column(columnDefinition="numeric default 0")
    protected Double maxScore = 0.0;

    @Column(columnDefinition="numeric default 0")
    protected Double evaluatedScore;

    @OneToOne(cascade = CascadeType.PERSIST) // do not delete parent question
    protected AbstractQuestion parent;

    @OneToOne (cascade = CascadeType.ALL)
    protected AbstractAnswer answer;

    @Column(columnDefinition = "TEXT")
    protected String evaluationCriterias;

    @OneToOne(cascade = CascadeType.ALL)
    protected Attachment attachment;

    // In UI, section has been expanded
    @Column(columnDefinition="boolean default false")
    private boolean expanded;

    @OneToMany(mappedBy = "question_id")
    @JsonBackReference
    private ExamSectionQuestion sectionQuestion;

    public ExamSectionQuestion getSectionQuestion() {
        return sectionQuestion;
    }

    public void setSectionQuestion(ExamSectionQuestion sectionQuestion) {
        this.sectionQuestion = sectionQuestion;
    }

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

    @Override
    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (!(object instanceof AbstractQuestion)) {
            return false;
        }
        AbstractQuestion other = (AbstractQuestion)object;
        return new EqualsBuilder().append(id, other.getId()).build();
    }

	public abstract AbstractQuestion copy();

   	@Override
    public String toString() {
        return "AbstractQuestion [type=" + type + ", question=" + question
                + ", shared=" + shared + ", instruction=" + instruction
                + ", parent=" + parent
                + ", evaluationCriterias=" + evaluationCriterias + "]";
    }

}
