package models;

import models.dto.ExamScore;

import javax.persistence.Entity;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import java.util.Date;


@Entity
public class ExamRecord extends GeneratedIdentityModel {

    @OneToOne
    private User teacher;
    @OneToOne
    private User student;
    @OneToOne
    private Exam exam;
    @OneToOne
    private ExamScore examScore;

    // what timestamp is this? The moments teacher marked Exam as recorded
    @Temporal(TemporalType.TIMESTAMP)
    private Date timeStamp;

    public User getTeacher() {
        return teacher;
    }

    public void setTeacher(User teacher) {
        this.teacher = teacher;
    }

    public User getStudent() {
        return student;
    }

    public void setStudent(User student) {
        this.student = student;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }

    public ExamScore getExamScore() {
        return examScore;
    }

    public void setExamScore(ExamScore examScore) {
        this.examScore = examScore;
    }

    public Date getTimeStamp() {
        return timeStamp;
    }

    public void setTimeStamp(Date timeStamp) {
        this.timeStamp = timeStamp;
    }

}
