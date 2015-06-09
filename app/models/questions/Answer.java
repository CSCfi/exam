package models.questions;

import models.Attachment;
import models.OwnedModel;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.OneToOne;

@Entity
public class Answer extends OwnedModel {

    protected String type;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    @Column(columnDefinition = "TEXT")
    private String answer;

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    @OneToOne(cascade = CascadeType.ALL)
    protected Attachment attachment;

    public Attachment getAttachment() {
        return attachment;
    }

    public void setAttachment(Attachment attachment) {
        this.attachment = attachment;
    }

    @OneToOne(cascade = CascadeType.ALL)
    private MultipleChoiseOption option;

    public MultipleChoiseOption getOption() {
        return option;
    }

    public void setOption(MultipleChoiseOption option) {
        this.option = option;
    }


    @Override
    public String toString() {
        return "Answer{" +
                "type='" + type + '\'' +
                '}';
    }
}
