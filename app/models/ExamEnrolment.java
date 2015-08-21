package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.api.CountsAsTrial;

import javax.annotation.Nonnull;
import javax.persistence.*;
import java.util.Date;


@Entity
public class ExamEnrolment extends GeneratedIdentityModel implements Comparable<ExamEnrolment>, CountsAsTrial {

    @ManyToOne
    @JsonBackReference
    private User user;

    @ManyToOne
    @JsonBackReference
    private Exam exam;

    @OneToOne(cascade = CascadeType.REMOVE)
    private Reservation reservation;

    @Temporal(TemporalType.TIMESTAMP)
    private Date enrolledOn;

    private String information;

    private boolean reservationCanceled;

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Date getEnrolledOn() {
        return enrolledOn;
    }

    public void setEnrolledOn(Date enrolledOn) {
        this.enrolledOn = enrolledOn;
    }

    public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
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
        return enrolledOn.compareTo(other.enrolledOn);
    }

    @Override
    @Transient
    public Date getTrialTime() {
        return reservation == null ? null : reservation.getStartAt();
    }

    @Override
    @Transient
    public boolean isProcessed() {
        return reservation == null || !reservation.isNoShow();
    }
}
