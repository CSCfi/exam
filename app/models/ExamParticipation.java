/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import models.base.GeneratedIdentityModel;
import models.json.CollaborativeExam;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import util.datetime.DateTimeAdapter;

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
