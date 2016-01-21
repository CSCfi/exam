package models.questions;

import com.avaje.ebean.annotation.EnumMapping;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.Attachment;
import models.OwnedModel;
import models.api.AttachmentContainer;

import javax.persistence.*;
import java.util.List;

@Entity
public class Answer extends OwnedModel implements AttachmentContainer {

    @EnumMapping(integerType = true, nameValuePairs = "MultipleChoiceAnswer=1, EssayAnswer=2, WeightedMultipleChoiceAnswer=3")
    public enum Type { MultipleChoiceAnswer, EssayAnswer, WeightedMultipleChoiceAnswer }

    protected Type type;

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    public void setType(Question.Type questionType) {
        switch (questionType) {
            case EssayQuestion:
                type = Type.EssayAnswer;
                break;
            case MultipleChoiceQuestion:
                type = Type.MultipleChoiceAnswer;
                break;
            case WeightedMultipleChoiceQuestion:
                type = Type.WeightedMultipleChoiceAnswer;
                break;
        }
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

    @Override
    public Attachment getAttachment() {
        return attachment;
    }

    @Override
    public void setAttachment(Attachment attachment) {
        this.attachment = attachment;
    }

    @OneToMany(cascade = {CascadeType.ALL}, mappedBy = "answer")
    @JsonManagedReference
    private List<MultipleChoiceOption> options;

    public List<MultipleChoiceOption> getOptions() {
        return options;
    }

    public void setOptions(List<MultipleChoiceOption> options) {
        this.options = options;
    }


    @Override
    public String toString() {
        return "Answer{" +
                "type='" + type + '\'' +
                '}';
    }
}
