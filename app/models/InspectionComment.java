package models;

import models.base.OwnedModel;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;

@Entity
public class InspectionComment extends OwnedModel {

    @Column(columnDefinition = "TEXT")
    private String comment;

    @ManyToOne
    private Exam exam;

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }
}
