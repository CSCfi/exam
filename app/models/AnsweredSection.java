package models;

import play.db.ebean.Model;

import javax.persistence.*;
import java.util.List;

/*
 *   Answered section is used to store a copy of sections where the user has answered a question.
 *   This data is needed in case the teacher changes a question that the user has answered to.
 *   In this case the original question needs to be stored and shown to the instructor in evaluation situation.
 */

@Entity
public class AnsweredSection extends Model {

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private Long id;

    private String name;

    @OneToMany(cascade = CascadeType.ALL)
    private List<Answer> answers;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return "AnsweredSection{" +
                "name='" + name + '\'' +
                '}';
    }
}
