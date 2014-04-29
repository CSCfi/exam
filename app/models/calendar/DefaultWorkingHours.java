package models.calendar;

import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Time;
import java.sql.Timestamp;

@Entity
@DiscriminatorValue("DefaultWorkingHours")
public class DefaultWorkingHours extends Model {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

    @Temporal(TemporalType.TIME)
    protected Timestamp startTime;

    @Temporal(TemporalType.TIME)
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
