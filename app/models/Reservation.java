package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import org.joda.time.Interval;
import play.db.ebean.Model;

import javax.persistence.*;
import java.util.Date;
import java.sql.Timestamp;

@Entity
public class Reservation extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @Temporal(TemporalType.TIMESTAMP)
    private Date startAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date endAt;

    @OneToOne
    @JsonBackReference
    ExamMachine machine;

    @OneToOne
    @JsonBackReference
    User user;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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

    @Transient
    public Interval toInterval() {
        return new Interval(startAt.getTime(), endAt.getTime());
    }
}
