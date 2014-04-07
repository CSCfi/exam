package models.answers;

import models.questions.MultipleChoiseOption;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;
import javax.persistence.OneToOne;

/**
 * Created by avainik on 3/7/14.
 */
@Entity
@DiscriminatorValue("MultipleChoiseAnswer")
public class MultipleChoiseAnswer extends AbstractAnswer {

    public MultipleChoiseAnswer() {
        this.type = this.getClass().getSimpleName();
    }

    @OneToOne
    private MultipleChoiseOption option;

    @Override
    public String generateHash() {

//        String attributes = question + instruction;
//
//        for(MultipleChoiseOption option : options)
//            attributes += option.getOption();
//
//        this.hash = SitnetUtil.encodeMD5(attributes);
//        Logger.debug("Question hash: " + this.hash);
        return "Implement me";
    }

//    @Override
    public String getType() {
        return this.type;
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
