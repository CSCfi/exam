package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.questions.Question;

import javax.persistence.*;
import java.util.List;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"name", "creator_id"}))
public class Tag extends OwnedModel {

    @Column(nullable = false, length = 32)
    private String name;

    @ManyToMany(mappedBy = "tags", cascade = CascadeType.ALL)
    @JsonBackReference
    private List<Question> questions;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<Question> getQuestions() {
        return questions;
    }

    public void setQuestions(List<Question> questions) {
        this.questions = questions;
    }

}
