package models;

import models.dto.ExamScore;
import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;
import java.util.Date;

/**
 * Created by alahtinen on 02/09/14.
 */
@Entity
public class ExamRecord extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private Long id;

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

    // the moment this record was exported to Education administration system
    @Temporal(TemporalType.TIMESTAMP)
    private Date recordedOn;

    public Date getRecordedOn() {
        return recordedOn;
    }

    public void setRecordedOn(Date recordedOn) {
        this.recordedOn = recordedOn;
    }

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

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }
}
