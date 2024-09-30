// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.enrolment;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import miscellaneous.datetime.DateTimeAdapter;
import models.base.GeneratedIdentityModel;
import models.exam.Exam;
import models.iop.CollaborativeExam;
import models.user.User;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;

@Entity
public class ExamParticipation extends GeneratedIdentityModel {

    @ManyToOne
    @JsonManagedReference
    private User user;

    @OneToOne
    @JsonBackReference
    private Exam exam;

    @ManyToOne
    @JsonBackReference
    private CollaborativeExam collaborativeExam;

    @OneToOne(cascade = CascadeType.REMOVE)
    private Reservation reservation;

    @ManyToOne
    @JsonBackReference
    private ExaminationEvent examinationEvent;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime started;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime ended;

    @Temporal(TemporalType.TIMESTAMP) // TODO: should be in seconds or minutes
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime duration;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime deadline;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime sentForReview;

    public DateTime getDeadline() {
        return deadline;
    }

    public void setDeadline(DateTime deadline) {
        this.deadline = deadline;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }

    public CollaborativeExam getCollaborativeExam() {
        return collaborativeExam;
    }

    public void setCollaborativeExam(CollaborativeExam collaborativeExam) {
        this.collaborativeExam = collaborativeExam;
    }

    public Reservation getReservation() {
        return reservation;
    }

    public void setReservation(Reservation reservation) {
        this.reservation = reservation;
    }

    public ExaminationEvent getExaminationEvent() {
        return examinationEvent;
    }

    public void setExaminationEvent(ExaminationEvent examinationEvent) {
        this.examinationEvent = examinationEvent;
    }

    public DateTime getStarted() {
        return started;
    }

    public void setStarted(DateTime started) {
        this.started = started;
    }

    public DateTime getEnded() {
        return ended;
    }

    public void setEnded(DateTime ended) {
        this.ended = ended;
    }

    public DateTime getDuration() {
        return duration;
    }

    public void setDuration(DateTime duration) {
        this.duration = duration;
    }

    public DateTime getSentForReview() {
        return sentForReview;
    }

    public void setSentForReview(DateTime sentForReview) {
        this.sentForReview = sentForReview;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ExamParticipation otherParticipation)) {
            return false;
        }
        return new EqualsBuilder().append(id, otherParticipation.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }
}
