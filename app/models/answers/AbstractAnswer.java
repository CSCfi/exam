package models.answers;

import models.Comment;
import models.SitnetModel;

import javax.persistence.*;
import java.util.List;

/**
 * Created by avainik on 3/6/14.
 */
@Entity
@Table(name="answer")
@Inheritance(strategy=InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name="answer_type",  discriminatorType=DiscriminatorType.STRING)
@DiscriminatorValue("AbstractAnswer")


abstract public class AbstractAnswer extends SitnetModel implements AnswerInterface {

    protected String type;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    @Override
    public String toString() {
        return "AbstractAnswer{" +
                "type='" + type + '\'' +
                '}';
    }
}
