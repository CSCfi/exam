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
    protected Timestamp startTime;

    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp endTime;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
}
