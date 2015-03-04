package models.dto;

import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;


@Entity
public class ExamScore extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String studentId;
    private String student;
    private String identifier;
    private String courseUnitCode;
    private String examDate;
    private String credits;
    private String creditLanguage;
    private String studentGrade;
    private String gradeScale;
    private String examScore;
    private String courseUnitLevel;
    private String courseUnitType;
    private String creditType;
    private String lecturer;
    private String lecturerId;
    private String date;
    private String courseImplementation;
    private String additionalInfo;
    private String lecturerEmployeeNumber;

    public String getCourseImplementation() {
        return courseImplementation;
    }

    public void setCourseImplementation(String courseImplementation) {
        this.courseImplementation = courseImplementation;
    }

    public String getCourseUnitCode() {
        return courseUnitCode;
    }

    public void setCourseUnitCode(String courseUnitCode) {
        this.courseUnitCode = courseUnitCode;
    }

    public String getCourseUnitLevel() {
        return courseUnitLevel;
    }

    public void setCourseUnitLevel(String courseUnitLevel) {
        this.courseUnitLevel = courseUnitLevel;
    }

    public String getCourseUnitType() {
        return courseUnitType;
    }

    public void setCourseUnitType(String courseUnitType) {
        this.courseUnitType = courseUnitType;
    }

    public String getCreditLanguage() {
        return creditLanguage;
    }

    public void setCreditLanguage(String creditLanguage) {
        this.creditLanguage = creditLanguage;
    }

    public String getCredits() {
        return credits;
    }

    public void setCredits(String credits) {
        this.credits = credits;
    }

    public String getCreditType() {
        return creditType;
    }

    public void setCreditType(String creditType) {
        this.creditType = creditType;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getExamDate() {
        return examDate;
    }

    public void setExamDate(String examDate) {
        this.examDate = examDate;
    }

    public String getExamScore() {
        return examScore;
    }

    public void setExamScore(String examScore) {
        this.examScore = examScore;
    }

    public String getGradeScale() {
        return gradeScale;
    }

    public void setGradeScale(String gradeScale) {
        this.gradeScale = gradeScale;
    }

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getLecturer() {
        return lecturer;
    }

    public void setLecturer(String lecturer) {
        this.lecturer = lecturer;
    }

    public String getLecturerId() {
        return lecturerId;
    }

    public void setLecturerId(String lecturerId) {
        this.lecturerId = lecturerId;
    }

    public String getStudent() {
        return student;
    }

    public void setStudent(String student) {
        this.student = student;
    }

    public String getStudentGrade() {
        return studentGrade;
    }

    public void setStudentGrade(String studentGrade) {
        this.studentGrade = studentGrade;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAdditionalInfo() {
        return additionalInfo;
    }

    public void setAdditionalInfo(String additionalInfo) {
        this.additionalInfo = additionalInfo;
    }

    public static String[] getHeaders() {
        return new String[]{"id", "studentId", "student", "identifier", "courseUnitCode", "examDate", "credits",
                "creditLanguage", "studentGrade", "gradeScale", "courseUnitLevel", "courseUnitType", "creditType",
                "lecturer", "lecturerId", "date", "courseImplementation", "additionalInfo", "lecturerEmployeeNumber"};
    }

    public String[] asArray() {
        return new String[]{Long.toString(id), studentId, student, identifier, courseUnitCode, examDate, credits,
                creditLanguage, studentGrade, gradeScale, courseUnitLevel, courseUnitType, creditType, lecturer,
                lecturerId, date, courseImplementation, additionalInfo};
    }
 
    public String getLecturerEmployeeNumber() { return lecturerEmployeeNumber; }

    public void setLecturerEmployeeNumber(String lecturerEmployeeNumber) { this.lecturerEmployeeNumber = lecturerEmployeeNumber; }
}
