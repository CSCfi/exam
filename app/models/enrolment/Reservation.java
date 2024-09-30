// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.enrolment;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import javax.annotation.Nonnull;
import miscellaneous.datetime.DateTimeAdapter;
import models.base.GeneratedIdentityModel;
import models.facility.ExamMachine;
import models.user.User;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import org.joda.time.Interval;

@Entity
public class Reservation extends GeneratedIdentityModel implements Comparable<Reservation> {

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime startAt;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime endAt;

    private boolean reminderSent;

    private boolean sentAsNoShow;

    @OneToOne(mappedBy = "reservation")
    @JsonBackReference
    private ExamEnrolment enrolment;

    @ManyToOne
    @JoinColumn(name = "machine_id")
    @JsonBackReference
    private ExamMachine machine;

    @ManyToOne
    @JoinColumn(name = "user_id")
    @JsonBackReference
    private User user;

    private String externalRef;

    private String externalUserRef;

    @OneToOne(cascade = CascadeType.ALL)
    private ExternalReservation externalReservation;

    public DateTime getStartAt() {
        return startAt;
    }

    public void setStartAt(DateTime startAt) {
        this.startAt = startAt;
    }

    public DateTime getEndAt() {
        return endAt;
    }

    public void setEndAt(DateTime endAt) {
        this.endAt = endAt;
    }

    public boolean isReminderSent() {
        return reminderSent;
    }

    public void setReminderSent(boolean reminderSent) {
        this.reminderSent = reminderSent;
    }

    public boolean isSentAsNoShow() {
        return sentAsNoShow;
    }

    public void setSentAsNoShow(boolean sentAsNoShow) {
        this.sentAsNoShow = sentAsNoShow;
    }

    public ExamMachine getMachine() {
        return machine;
    }

    public void setMachine(ExamMachine machine) {
        this.machine = machine;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public ExamEnrolment getEnrolment() {
        return enrolment;
    }

    public void setEnrolment(ExamEnrolment enrolment) {
        this.enrolment = enrolment;
    }

    public String getExternalRef() {
        return externalRef;
    }

    public void setExternalRef(String externalRef) {
        this.externalRef = externalRef;
    }

    public String getExternalUserRef() {
        return externalUserRef;
    }

    public ExternalReservation getExternalReservation() {
        return externalReservation;
    }

    public void setExternalReservation(ExternalReservation externalReservation) {
        this.externalReservation = externalReservation;
    }

    public void setExternalUserRef(String externalUserRef) {
        this.externalUserRef = externalUserRef;
    }

    public Interval toInterval() {
        return new Interval(startAt, endAt);
    }

    @Override
    public int compareTo(@Nonnull Reservation o) {
        return startAt.compareTo(o.startAt);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Reservation that)) return false;
        return new EqualsBuilder().append(id, that.id).isEquals();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder(17, 37).append(id).toHashCode();
    }
}
