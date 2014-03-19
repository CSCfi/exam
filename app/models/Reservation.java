package models;

import java.sql.Date;
import java.sql.Time;


/* 
 * Tilavaraus
 * http://tietomalli.csc.fi/Tilavaraus-kaavio.html
 * 
 * 
 */
public class Reservation {

	private Date startDate;
	private Time startTime;
	
	private Date endDate;
	private Time endTime;

    public Date getStartDate() {
        return startDate;
    }

    public void setStartDate(Date startDate) {
        this.startDate = startDate;
    }

    public Time getStartTime() {
        return startTime;
    }

    public void setStartTime(Time startTime) {
        this.startTime = startTime;
    }

    public Date getEndDate() {
        return endDate;
    }

    public void setEndDate(Date endDate) {
        this.endDate = endDate;
    }

    public Time getEndTime() {
        return endTime;
    }

    public void setEndTime(Time endTime) {
        this.endTime = endTime;
    }
}
