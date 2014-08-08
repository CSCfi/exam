package models.calendar;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.ExamRoom;
import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
@DiscriminatorValue("DefaultWorkingHours")
public class DefaultWorkingHours extends Model {

    public enum Day {
        MONDAY,
        TUESDAY,
        WEDNESDAY,
        THURSDAY,
        FRIDAY,
        SATURDAY,
        SUNDAY
    }

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

    @Temporal(TemporalType.TIME)
    protected Timestamp startTime;

    @Temporal(TemporalType.TIME)
    protected Timestamp endTime;

    private String day;

    @ManyToOne
    @JsonBackReference
    private ExamRoom room;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ExamRoom getRoom() {
        return room;
    }

    public void setRoom(ExamRoom room) {
        this.room = room;
    }

    public Timestamp getStartTime() {
        return startTime;
    }

    public void setStartTime(Timestamp startTime) {
        this.startTime = startTime;
    }

    public Timestamp getEndTime() {
        return endTime;
    }

    public void setEndTime(Timestamp endTime) {
        this.endTime = endTime;
    }

    public String getDay() {
        return day;
    }

    public void setDay(String day) {
        this.day = day;
    }
}
