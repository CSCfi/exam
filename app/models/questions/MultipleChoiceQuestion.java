package models.questions;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import play.Logger;
import util.SitnetUtil;

import javax.persistence.CascadeType;
import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;
import javax.persistence.OneToMany;
import java.util.List;

/**
 * Created by avainik on 3/7/14.
 */
@Entity
@DiscriminatorValue("MultipleChoiceQuestion")
public class MultipleChoiceQuestion extends AbstractQuestion implements QuestionInterface {

    public MultipleChoiceQuestion() {
        this.type = this.getClass().getSimpleName();
    }


    @OneToMany(cascade = CascadeType.PERSIST, mappedBy="question")
    @JsonManagedReference
    private List<MultipleChoiseOption> options;

    @Override
    public String generateHash() {

        String attributes = question + instruction;

        for(MultipleChoiseOption option : options)
            attributes += option.getOption();

        this.hash = SitnetUtil.encodeMD5(attributes);
        Logger.debug("Question hash: " + this.hash);
        return hash;
    }

    @Override
    public String getType() {
        return this.type;
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
    protected Object clone() throws CloneNotSupportedException {
        return super.clone();
    }
}
