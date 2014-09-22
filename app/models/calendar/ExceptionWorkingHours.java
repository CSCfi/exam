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

    @Version
    protected Long ebeanTimestamp;

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private Long id;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp startDate;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp endDate;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp startTime;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp endTime;

    @ManyToOne
    @JsonBackReference
    private ExamRoom room;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Timestamp getEndDate() {
        return endDate;
    }

    public void setEndDate(Timestamp endDate) {
        this.endDate = endDate;
    }

    public Timestamp getEndTime() {
        return endTime;
    }

    public void setEndTime(Timestamp endTime) {
        this.endTime = endTime;
    }

    public ExamRoom getRoom() {
        return room;
    }

    public void setRoom(ExamRoom room) {
        this.room = room;
    }

    public Timestamp getStartDate() {
        return startDate;
    }

    public void setStartDate(Timestamp startDate) {
        this.startDate = startDate;
    }

    public Timestamp getStartTime() {
        return startTime;
    }

    public void setStartTime(Timestamp startTime) {
        this.startTime = startTime;
    }

}
