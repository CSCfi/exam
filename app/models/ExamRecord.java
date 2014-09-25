package models;

import models.dto.CourseUnitInfo;
import models.dto.ExamScore;
import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;

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
    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp timeStamp;
    @OneToOne
    private CourseUnitInfo courseUnitInfo;

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

    public Timestamp getTimeStamp() {
        return timeStamp;
    }

    public void setTimeStamp(Timestamp timeStamp) {
        this.timeStamp = timeStamp;
    }

    public CourseUnitInfo getCourseUnitInfo() {
        return courseUnitInfo;
    }

    public void setCourseUnitInfo(CourseUnitInfo courseUnitInfo) {
        this.courseUnitInfo = courseUnitInfo;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }
}
