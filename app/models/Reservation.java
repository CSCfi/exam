package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import org.joda.time.Interval;
import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;


/* 
 * Tilavaraus
 * http://tietomalli.csc.fi/Tilavaraus-kaavio.html
 * 
 * 
 */
@Entity
public class Reservation extends Model {

    @Version
    protected Long ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp startAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp endAt;

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

    public Timestamp getStartAt() {
        return startAt;
    }

    public void setStartAt(Timestamp startAt) {
        this.startAt = startAt;
    }

    public Timestamp getEndAt() {
        return endAt;
    }

    public void setEndAt(Timestamp endAt) {
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
