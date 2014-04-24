package models.calendar;

import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Time;
import java.sql.Timestamp;

/**
 * Created by avainik on 4/22/14.
 */
@Entity
@DiscriminatorValue("DefaultWorkingHours")
public class DefaultWorkingHours extends Model {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

//    public DefaultWorkingHours() {
//        this.event_type = this.getClass().getSimpleName();
//    }

    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp startDate;

    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp endDate;

    @Temporal(TemporalType.TIME)
    protected Time startTime;

    @Temporal(TemporalType.TIME)
    protected Time endTime;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Timestamp getStartDate() {
        return startDate;
    }

    public void setStartDate(Timestamp startDate) {
        this.startDate = startDate;
    }

    public Timestamp getEndDate() {
        return endDate;
    }

    public void setEndDate(Timestamp endDate) {
        this.endDate = endDate;
    }

    public Time getStartTime() {
        return startTime;
    }

    public void setStartTime(Time startTime) {
        this.startTime = startTime;
    }

    public Time getEndTime() {
        return endTime;
    }

    public void setEndTime(Time endTime) {
        this.endTime = endTime;
    }
}
