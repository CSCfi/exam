package models.answers;

import models.questions.MultipleChoiseOption;

import javax.persistence.CascadeType;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;
import javax.persistence.OneToOne;

@Entity
@DiscriminatorValue("MultipleChoiseAnswer")
public class MultipleChoiseAnswer extends AbstractAnswer {

    public MultipleChoiseAnswer() {
        type = getClass().getSimpleName();
    }

    @OneToOne(cascade = CascadeType.ALL)
    private MultipleChoiseOption option;

    @Override
    public String getType() {
        return type;
    }

    public MultipleChoiseOption getOption() {
        return option;
    }

    public void setOption(MultipleChoiseOption option) {
        this.option = option;
    }

    @Override
    public String toString() {
        return "MultipleChoiseAnswer{" +
                "option=" + option +
                '}';
    }
}
