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

package backend.models;

import javax.annotation.Nonnull;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;

import backend.models.base.GeneratedIdentityModel;
import backend.models.json.CollaborativeExam;
import backend.models.json.ExternalExam;
import backend.util.datetime.DateTimeAdapter;
import backend.util.datetime.DateTimeUtils;


@Entity
public class ExamEnrolment extends GeneratedIdentityModel implements Comparable<ExamEnrolment> {

    @ManyToOne
    @JsonBackReference
    private User user;

    @ManyToOne
    @JsonBackReference
    private Exam exam;

    @ManyToOne
    @JsonBackReference
    private CollaborativeExam collaborativeExam;

    @OneToOne(cascade = CascadeType.ALL)
    @JsonBackReference
    private ExternalExam externalExam;

    @OneToOne(cascade = CascadeType.REMOVE)
    private Reservation reservation;

    @ManyToOne
    private ExaminationEventConfiguration examinationEventConfiguration;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime enrolledOn;

    private String information;

    private boolean reservationCanceled;

    private String preEnrolledUserEmail;

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public DateTime getEnrolledOn() {
        return enrolledOn;
    }

    public void setEnrolledOn(DateTime enrolledOn) {
        this.enrolledOn = enrolledOn;
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

    public ExternalExam getExternalExam() {
        return externalExam;
    }

    public void setExternalExam(ExternalExam externalExam) {
        this.externalExam = externalExam;
    }

    public Reservation getReservation() {
        return reservation;
    }

    public void setReservation(Reservation reservation) {
        this.reservation = reservation;
    }

    public ExaminationEventConfiguration getExaminationEventConfiguration() {
        return examinationEventConfiguration;
    }

    public void setExaminationEventConfiguration(ExaminationEventConfiguration examinationEventConfiguration) {
        this.examinationEventConfiguration = examinationEventConfiguration;
    }

    public String getInformation() {
        return information;
    }

    public void setInformation(String information) {
        this.information = information;
    }

    public boolean isReservationCanceled() {
        return reservationCanceled;
    }

    public void setReservationCanceled(boolean reservationCanceled) {
        this.reservationCanceled = reservationCanceled;
    }

    public String getPreEnrolledUserEmail() {
        return preEnrolledUserEmail;
    }

    public void setPreEnrolledUserEmail(String preEnrolledUserEmail) {
        this.preEnrolledUserEmail = preEnrolledUserEmail;
    }

    @Transient
    public boolean isActive() {
        DateTime now = DateTimeUtils.adjustDST(new DateTime());
        if (exam == null || !exam.getRequiresUserAgentAuth()) {
            return reservation == null || reservation.getEndAt().isAfter(now);
        }
        return examinationEventConfiguration == null ||
                examinationEventConfiguration.getExaminationEvent()
                        .getStart().plusMinutes(exam.getDuration()).isAfter(now);
    }


    @Override
    public int compareTo(@Nonnull ExamEnrolment other) {
        if (reservation == null && other.reservation == null) {
            return 0;
        }
        if (reservation == null) {
            return -1;
        }
        if (other.reservation == null) {
            return 1;
        }
        return reservation.compareTo(other.reservation);
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ExamEnrolment)) {
            return false;
        }
        ExamEnrolment otherEnrolment = (ExamEnrolment) other;
        return new EqualsBuilder().append(id, otherEnrolment.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }
}
