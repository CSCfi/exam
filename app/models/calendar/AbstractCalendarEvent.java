package models.calendar;

import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;

/**
 * Created by avainik on 4/22/14.
 */

@Entity
@Table(name = "calendar_event")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "event_type", discriminatorType = DiscriminatorType.STRING)
@DiscriminatorValue("AbstractCalendarEvent")
abstract public class AbstractCalendarEvent extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    protected Long id;

    @Column(name="event_type")
    protected String event_type;

    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp startDate;

    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp endDate;

    @Temporal(TemporalType.TIME)
    protected Timestamp startTime;

    @Temporal(TemporalType.TIME)
    protected Timestamp endTime;

    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp interval;

    @Column(columnDefinition="boolean default false")
    protected boolean reoccurring;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEvent_type() {
        return event_type;
    }

    public void setEvent_type(String event_type) {
        this.event_type = event_type;
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

    public Timestamp getInterval() {
        return interval;
    }

    public void setInterval(Timestamp interval) {
        this.interval = interval;
    }

    public boolean getReoccurring() {
        return reoccurring;
    }

    public void setReoccurring(boolean reoccurring) {
        this.reoccurring = reoccurring;
    }
}
