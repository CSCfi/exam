package models.calendar;

import org.joda.time.DateTime;
import org.joda.time.LocalTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.Logger;

import java.util.*;

import static models.calendar.DefaultWorkingHours.Day;

public class DefaultWorkingHourDTO {

    private int endHour;
    private int startHour;
    private int stepMinutes = 30;
    final static DateTimeFormatter fmt = DateTimeFormat.forPattern("HH:mm");


    private List<List<DefaultSlotDTO>> hours;

    public int getEndHour() {
        return endHour;
    }

    public void setEndHour(int endHour) {
        this.endHour = endHour;
    }

    public List<List<DefaultSlotDTO>> getHours() {
        return hours;
    }

    public void setHours(List<List<DefaultSlotDTO>> hours) {
        this.hours = hours;
    }

    private Date convertTime(int row) {

        if(row > 0 && row/2 == endHour) {  //24:00 -> 23.59.59
            return new DateTime().withHourOfDay(23).withMinuteOfHour(59).withSecondOfMinute(59).toDate();
        }
        return new LocalTime().withHourOfDay(startHour).plusMinutes(row * stepMinutes).toDateTimeToday().toDate();
    }

    public List<DefaultWorkingHours> getDefaultWorkingHours() {

        HashMap<Day, List<Integer>> ongoing = new HashMap<>();
        List<DefaultWorkingHours> allHours = new ArrayList<>();

        if (hours == null) {
            return allHours;
        }

        //order rows, data format is rather obscure..
        for (List<DefaultSlotDTO> row : hours) {
            for (DefaultSlotDTO cell : row) {
                Day day = Day.values()[cell.getDay()];
                if (!ongoing.containsKey(day)) {
                    ongoing.put(day, new ArrayList<Integer>());
                }
                ongoing.get(day).add(cell.getTime());
            }
        }

        Logger.debug("ongoing: " + ongoing);
        //loop for days
        for (Day day : Day.values()) {

            List<Integer> times = ongoing.get(day);
            if (times == null) {
                continue;
            }

            Integer previous = null;
            DefaultWorkingHours hours = new DefaultWorkingHours();

            Iterator<Integer> iter = times.iterator();
            while (iter.hasNext()) {
                Integer current = iter.next();

                //no ongoing time lets create a new one for the day
                if (previous == null) {
                    hours = new DefaultWorkingHours();
                    hours.setDay(day.toString());
                    hours.setStartTime(convertTime(current));
                    previous = current;
                    continue;
                }

                //last element, we have to close
                if (!iter.hasNext()) {
                    hours.setEndTime(convertTime(current));
                    allHours.add(hours);
                    break;
                }

                //there is gap, lets end started slot and add it to array
                if ((previous + 1) != current) {
                    hours.setEndTime(convertTime(previous));
                    allHours.add(hours);

                    //and create a new entry
                    hours = new DefaultWorkingHours();
                    hours.setDay(day.toString());
                    hours.setStartTime(convertTime(current));
                    previous = current;
                    continue;
                }
                previous++;
            }
        }
        return allHours;
    }
}
