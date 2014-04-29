package models.calendar;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.ExamRoom;
import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;

/**
 * Created by avainik on 4/22/14.
 */
@Entity
@DiscriminatorValue("ExceptionWorkingHours")
public class ExceptionWorkingHours extends Model {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp exceptionStartDate;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp exceptionEndDate;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp exceptionStartTime;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp exceptionEndTime;

    @ManyToOne
    @JsonBackReference
    private ExamRoom room;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Timestamp getExceptionStartDate() {
        return exceptionStartDate;
    }

    public void setExceptionStartDate(Timestamp exceptionStartDate) {
        this.exceptionStartDate = exceptionStartDate;
    }

    public Timestamp getExceptionEndDate() {
        return exceptionEndDate;
    }

    public void setExceptionEndDate(Timestamp exceptionEndDate) {
        this.exceptionEndDate = exceptionEndDate;
    }

    public Timestamp getExceptionStartTime() {
        return exceptionStartTime;
    }

    public void setExceptionStartTime(Timestamp exceptionStartTime) {
        this.exceptionStartTime = exceptionStartTime;
    }

    public Timestamp getExceptionEndTime() {
        return exceptionEndTime;
    }

    public void setExceptionEndTime(Timestamp exceptionEndTime) {
        this.exceptionEndTime = exceptionEndTime;
    }

    public ExamRoom getRoom() {
        return room;
    }

    public void setRoom(ExamRoom room) {
        this.room = room;
    }
}
