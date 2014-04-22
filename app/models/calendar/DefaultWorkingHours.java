package models.calendar;

import javax.persistence.DiscriminatorValue;
import javax.persistence.Entity;

/**
 * Created by avainik on 4/22/14.
 */
@Entity
@DiscriminatorValue("DefaultWorkingHours")
public class DefaultWorkingHours extends AbstractCalendarEvent {

    public DefaultWorkingHours() {
        this.event_type = this.getClass().getSimpleName();
    }

}
