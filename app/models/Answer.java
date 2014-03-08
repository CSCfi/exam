package models;

import models.questions.MultipleChoiseOption;
import play.db.ebean.Model;

import javax.persistence.*;

@Entity
public class Answer extends Model {

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    private Long id;

//    private byte[] data;

    @OneToMany(cascade = CascadeType.ALL)
    private MultipleChoiseOption answeredOptions;

//    @OneToOne
//    private Question question;

//    public byte[] getData() {
//        return data;
//    }
//
//    public void setData(byte[] data) {
//        this.data = data;
//    }


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public MultipleChoiseOption getAnsweredOptions() {
        return answeredOptions;
    }

    public void setAnsweredOptions(MultipleChoiseOption answeredOptions) {
        this.answeredOptions = answeredOptions;
    }

//    public Question getQuestion() {
//        return question;
//    }
//
//    public void setQuestion(Question question) {
//        this.question = question;
//    }

    @Override
    public String toString() {
        return "Answer{" +
                "id=" + id +
                ", answeredOptions=" + answeredOptions +
                '}';
    }
}
