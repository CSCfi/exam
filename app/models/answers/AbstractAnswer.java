package models.answers;

import models.Attachment;
import models.BasicModel;

import javax.persistence.*;

@Entity
@DiscriminatorValue("AbstractAnswer")
@DiscriminatorColumn(discriminatorType=DiscriminatorType.STRING, name="answer_type")
@Inheritance(strategy=InheritanceType.SINGLE_TABLE)
@Table(name="answer")
public abstract class AbstractAnswer extends BasicModel implements AnswerInterface {

    protected String type;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    @OneToOne(cascade = CascadeType.ALL)
    protected Attachment attachment;

    public Attachment getAttachment() {
        return attachment;
    }

    public void setAttachment(Attachment attachment) {
        this.attachment = attachment;
    }

    @Override
    public String toString() {
        return "AbstractAnswer{" +
                "type='" + type + '\'' +
                '}';
    }
}
