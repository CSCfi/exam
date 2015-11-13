package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
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
    ExamEnrolment enrolment;

    @OneToOne
    @JsonBackReference
    ExamMachine machine;

    @OneToOne
    @JsonBackReference
    User user;

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



    @Transient
    public Interval toInterval() {
        return new Interval(startAt.getTime(), endAt.getTime());
    }

    @Override
    public int compareTo(@Nonnull Reservation o) {
        return startAt.compareTo(o.startAt);
    }
}
