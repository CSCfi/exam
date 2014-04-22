package models.calendar;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

/**
 * Created by avainik on 4/22/14.
 */
@Entity
@DiscriminatorValue("ExceptionWorkingHours")
public class ExceptionWorkingHours extends AbstractCalendarEvent {

    public ExceptionWorkingHours() {
        this.event_type = this.getClass().getSimpleName();
    }

}
