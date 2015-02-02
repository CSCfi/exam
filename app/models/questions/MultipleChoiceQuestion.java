package models.questions;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import org.springframework.beans.BeanUtils;

import javax.persistence.CascadeType;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;
import javax.persistence.OneToMany;
import java.util.ArrayList;
import java.util.List;

@Entity
@DiscriminatorValue("MultipleChoiceQuestion")
public class MultipleChoiceQuestion extends AbstractQuestion {

    @OneToMany(cascade = {CascadeType.PERSIST, CascadeType.REMOVE}, mappedBy = "question")
    @JsonManagedReference
    private List<MultipleChoiseOption> options = new ArrayList<>();

    public MultipleChoiceQuestion() {
        type = getClass().getSimpleName();
    }

    public List<MultipleChoiseOption> getOptions() {
        return options;
    }

    public void setOptions(List<MultipleChoiseOption> options) {
        this.options = options;
    }

    @Override
    public String toString() {
        return super.toString() + "MultipleChoiceQuestion{" +
                "options=" + options +
                '}';
    }

    @Override
    public MultipleChoiceQuestion copy() {
        MultipleChoiceQuestion question = new MultipleChoiceQuestion();
        BeanUtils.copyProperties(this, question, new String[]{"id", "answer", "options"});
        question.setParent(this);
        for (MultipleChoiseOption o : options) {
            question.getOptions().add(o.copy());
        }
        return question;
    }

}
