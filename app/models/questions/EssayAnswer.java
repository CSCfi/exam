package models.questions;

import models.Attachment;
import models.api.AttachmentContainer;
import models.base.OwnedModel;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.OneToOne;

@Entity
public class EssayAnswer extends OwnedModel implements AttachmentContainer {

    @Column(columnDefinition = "TEXT")
    private String answer;

    @OneToOne(cascade = CascadeType.ALL)
    protected Attachment attachment;

    @Column
    private Integer evaluatedScore;

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    @Override
    public Attachment getAttachment() {
        return attachment;
    }

    @Override
    public void setAttachment(Attachment attachment) {
        this.attachment = attachment;
    }

    public Integer getEvaluatedScore() {
        return evaluatedScore;
    }

    public void setEvaluatedScore(Integer evaluatedScore) {
        this.evaluatedScore = evaluatedScore;
    }
}
