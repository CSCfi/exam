package models.dto;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonProperty;
import models.Exam;
import models.ExamRecord;
import models.GeneratedIdentityModel;
import models.User;

import javax.persistence.Entity;
import javax.persistence.OneToOne;
import javax.persistence.Transient;


@Entity
public class ExamScore extends GeneratedIdentityModel {

    @OneToOne(mappedBy = "examScore")
    @JsonBackReference
    private ExamRecord examRecord;

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
    private String registrationDate;
    private String courseImplementation;
    private String additionalInfo;
    private String lecturerEmployeeNumber;

    public ExamRecord getExamRecord() {
        return examRecord;
    }

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

    @JsonProperty("date")
    public String getRegistrationDate() {
        return registrationDate;
    }

    public void setRegistrationDate(String registrationDate) {
        this.registrationDate = registrationDate;
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

    public String getAdditionalInfo() {
        return additionalInfo;
    }

    public void setAdditionalInfo(String additionalInfo) {
        this.additionalInfo = additionalInfo;
    }

    public String getLecturerEmployeeNumber() {
        return lecturerEmployeeNumber;
    }

    public void setLecturerEmployeeNumber(String lecturerEmployeeNumber) {
        this.lecturerEmployeeNumber = lecturerEmployeeNumber;
    }

    @Transient
    public static String[] getHeaders() {
        return new String[]{"id",
                "student", "studentFirstName", "studentLastName", "studentEmail", "studentId", "identifier",
                "courseUnitCode", "courseUnitName", "courseImplementation", "courseUnitLevel",
                "examDate", "creditType", "credits", "creditLanguage", "studentGrade", "gradeScale", "examScore",
                "lecturer", "lecturerFirstName", "lecturerLastName", "lecturerId", "lecturerEmployeeNumber",
                "date", "additionalInfo"};
    }

    @Transient
    public String[] asArray(User student, User teacher, Exam exam) {
        return new String[]{Long.toString(getId()),
                this.student, student.getFirstName(), student.getLastName(), student.getEmail(), studentId, identifier,
                courseUnitCode, exam.getCourse().getName(), courseImplementation, courseUnitLevel,
                examDate, creditType, credits, creditLanguage, studentGrade, gradeScale, examScore,
                lecturer, teacher.getFirstName(), teacher.getLastName(), lecturerId, lecturerEmployeeNumber,
                registrationDate, additionalInfo};
    }

}
