package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import models.api.CountsAsTrial;
import models.base.GeneratedIdentityModel;
import models.json.ExternalExam;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import util.java.DateTimeAdapter;

import javax.annotation.Nonnull;
import javax.persistence.*;


@Entity
public class ExamEnrolment extends GeneratedIdentityModel implements Comparable<ExamEnrolment>, CountsAsTrial {

    @ManyToOne
    @JsonBackReference
    private User user;

    @ManyToOne
    @JsonBackReference
    private Exam exam;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "external_exam_id")
    private ExternalExam externalExam;

    @OneToOne(cascade = CascadeType.REMOVE)
    private Reservation reservation;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime enrolledOn;

    private String information;

    private boolean reservationCanceled;

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
    @Transient
    public DateTime getTrialTime() {
        return reservation == null ? null : reservation.getStartAt();
    }

    @Override
    @Transient
    public boolean isProcessed() {
        return reservation == null || !reservation.isNoShow();
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
