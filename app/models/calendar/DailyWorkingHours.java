package models.calendar;

import org.joda.time.LocalDate;
import org.joda.time.LocalTime;

public class DailyWorkingHours {

    private LocalDate day;
    private LocalTime start;
    private LocalTime end;

    public LocalDate getDay() {
        return day;
    }

    public void setDay(LocalDate day) {
        this.day = day;
    }

    public LocalTime getEnd() {
        return end;
    }

    public void setEnd(LocalTime end) {
        this.end = end;
    }

    public LocalTime getStart() {
        return start;
    }

    public void setStart(LocalTime start) {
        this.start = start;
    }
}
