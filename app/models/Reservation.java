package models;

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

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp start;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp end;

    @OneToOne
    User user;

    @OneToOne
    ExamMachine machine;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Timestamp getStart() {
        return start;
    }

    public void setStart(Timestamp start) {
        this.start = start;
    }

    public Timestamp getEnd() {
        return end;
    }

    public void setEnd(Timestamp end) {
        this.end = end;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public ExamMachine getMachine() {
        return machine;
    }

    public void setMachine(ExamMachine machine) {
        this.machine = machine;
    }
}
