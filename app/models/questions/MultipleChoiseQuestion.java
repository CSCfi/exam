package models.questions;

import org.apache.commons.codec.digest.DigestUtils;
import play.Logger;

import javax.persistence.*;
import java.util.List;

/**
 * Created by avainik on 3/7/14.
 */
@Entity
@DiscriminatorValue("MultipleChoiseQuestion")
public class MultipleChoiseQuestion extends AbstractQuestion {

    public MultipleChoiseQuestion() {
        this.type = this.getClass().getSimpleName();
    }


    @OneToMany(cascade = CascadeType.PERSIST)
    private List<MultipleChoiseOption> options;

    @Override
    public String generateHash() {

        String attributes = question + instruction;

        for(MultipleChoiseOption option : options)
            attributes += option.getOption();

        this.hash = DigestUtils.md5Hex(attributes);
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
        return super.toString() + "MultipleChoiseQuestion{" +
                "options=" + options +
                '}';
    }

    @Override
    protected Object clone() throws CloneNotSupportedException {
        return super.clone();
    }
}
