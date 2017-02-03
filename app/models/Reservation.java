package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.base.GeneratedIdentityModel;
import models.iop.ExternalReservation;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.Interval;

import javax.annotation.Nonnull;
import javax.persistence.*;
import java.util.Date;

@Entity
public class Reservation extends GeneratedIdentityModel implements Comparable<Reservation> {

    @Temporal(TemporalType.TIMESTAMP)
    private Date startAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date endAt;

    private boolean noShow;

    private boolean retrialPermitted;

    @OneToOne(mappedBy = "reservation")
    @JsonBackReference
    private ExamEnrolment enrolment;

    @OneToOne
    @JsonBackReference
    private ExamMachine machine;

    @OneToOne
    @JsonBackReference
    private User user;

    private String externalRef;

    private String externalUserRef;

    @OneToOne(cascade = CascadeType.ALL)
    private ExternalReservation externalReservation;

    public Date getStartAt() {
        return startAt;
    }

    public void setStartAt(Date startAt) {
        this.startAt = startAt;
    }

    public Date getEndAt() {
        return endAt;
    }

    public void setEndAt(Date endAt) {
        this.endAt = endAt;
    }

    public boolean isNoShow() {
        return noShow;
    }

    public void setNoShow(boolean noShow) {
        this.noShow = noShow;
    }

    public boolean isRetrialPermitted() {
        return retrialPermitted;
    }

    public void setRetrialPermitted(boolean retrialPermitted) {
        this.retrialPermitted = retrialPermitted;
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

    @Transient
    public Interval toInterval() {
        return new Interval(startAt.getTime(), endAt.getTime());
    }

    @Override
    public int compareTo(@Nonnull Reservation o) {
        return startAt.compareTo(o.startAt);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Reservation)) return false;
        Reservation that = (Reservation) o;
        return new EqualsBuilder()
                .append(id, that.id)
                .isEquals();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder(17, 37)
                .append(id)
                .toHashCode();
    }
}
