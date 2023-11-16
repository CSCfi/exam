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
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import javax.annotation.Nonnull;
import models.base.GeneratedIdentityModel;
import models.iop.ExternalReservation;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import org.joda.time.Interval;
import util.datetime.DateTimeAdapter;

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
