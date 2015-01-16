package models.calendar;

import play.db.ebean.Model;

import javax.persistence.*;
import java.util.Date;

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
    protected Date ebeanTimestamp;

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    protected Long id;

    @Column(name="event_type")
    protected String event_type;

    @Temporal(TemporalType.TIMESTAMP)
    protected Date startDate;

    @Temporal(TemporalType.TIMESTAMP)
    protected Date endDate;

    @Temporal(TemporalType.TIME)
    protected Date startTime;

    @Temporal(TemporalType.TIME)
    protected Date endTime;

    @Temporal(TemporalType.TIMESTAMP)
    protected Date interval;

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

    public Date getStartDate() {
        return startDate;
    }

    public void setStartDate(Date startDate) {
        this.startDate = startDate;
    }

    public Date getEndDate() {
        return endDate;
    }

    public void setEndDate(Date endDate) {
        this.endDate = endDate;
    }

    public Date getStartTime() {
        return startTime;
    }

    public void setStartTime(Date startTime) {
        this.startTime = startTime;
    }

    public Date getEndTime() {
        return endTime;
    }

    public void setEndTime(Date endTime) {
        this.endTime = endTime;
    }

    public Date getInterval() {
        return interval;
    }

    public void setInterval(Date interval) {
        this.interval = interval;
    }

    public boolean getReoccurring() {
        return reoccurring;
    }

    public void setReoccurring(boolean reoccurring) {
        this.reoccurring = reoccurring;
    }
}
