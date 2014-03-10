package models.answers;

import models.Comment;
import models.SitnetModel;

import javax.persistence.*;
import java.util.List;

/**
 * Created by avainik on 3/6/14.
 */
@Entity
@Inheritance(strategy=InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name="answer_type",  discriminatorType=DiscriminatorType.STRING)
@Table(name="answer")


public class AbstractAnswer extends SitnetModel{

    protected String type;



    @OneToMany(cascade = CascadeType.PERSIST)
    protected List<Comment> comments;



}
