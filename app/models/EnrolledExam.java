package models;

import play.db.ebean.Model;

import javax.persistence.*;
import java.util.List;

/*
 *   Enrolled exam is used to map exams where the student is enrolled to and in what states those exams are
 */

@Entity
public class EnrolledExam extends Model {

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private Long id;

    @OneToOne
    private Exam exam;

    private String state;

    @OneToMany(cascade = CascadeType.ALL)
    private List<AnsweredSection> answeredSections;


    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public List<AnsweredSection> getAnsweredSections() {
        return answeredSections;
    }

    public void setAnsweredSections(List<AnsweredSection> answeredSections) {
        this.answeredSections = answeredSections;
    }

    @Override
    public String toString() {
        return "EnrolledExam{" +
                "exam=" + exam +
                ", state='" + state + '\'' +
                ", answeredSections=" + answeredSections +
                '}';
    }
}
