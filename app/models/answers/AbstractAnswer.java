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


abstract public class AbstractAnswer extends SitnetModel {

    protected String type;

    @OneToMany(cascade = CascadeType.PERSIST)
    protected List<Comment> comments;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public List<Comment> getComments() {
        return comments;
    }

    public void setComments(List<Comment> comments) {
        this.comments = comments;
    }

    @Override
    public String toString() {
        return "AbstractAnswer{" +
                "type='" + type + '\'' +
                ", comments=" + comments +
                '}';
    }
}
