// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import miscellaneous.datetime.DateTimeAdapter;
import models.admin.ExamScore;
import models.base.GeneratedIdentityModel;
import models.exam.Exam;
import models.user.User;
import org.joda.time.DateTime;

@Entity
public class ExamRecord extends GeneratedIdentityModel {

    @OneToOne
    private User teacher;

    @OneToOne
    private User student;

    @OneToOne
    private Exam exam;

    @OneToOne
    @JsonManagedReference
    private ExamScore examScore;

    // The moment exam was marked as graded and logged
    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime timeStamp;

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

    public DateTime getTimeStamp() {
        return timeStamp;
    }

    public void setTimeStamp(DateTime timeStamp) {
        this.timeStamp = timeStamp;
    }
}
