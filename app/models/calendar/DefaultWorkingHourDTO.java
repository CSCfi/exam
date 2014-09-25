package models.calendar;

import org.joda.time.LocalTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;

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

    public int getStartHour() {
        return startHour;
    }

    public void setStartHour(int startHour) {
        this.startHour = startHour;
    }

    public int getStepMinutes() {
        return stepMinutes;
    }

    public void setStepMinutes(int stepMinutes) {
        this.stepMinutes = stepMinutes;
    }

    private Timestamp convertTime(int row) {

        if(row > 0 && row/2 == endHour) {  //24:00 -> 23.59.59
            return new Timestamp(LocalTime.MIDNIGHT.minusSeconds(1).getMillisOfDay());
        }

        //System.out.println("-- row -- " + row);
        String start = String.format("%02d", startHour) + ":00";
        //System.out.println("-- start -- " + start);

        final LocalTime time = fmt.parseLocalTime(start).plusMinutes(row * stepMinutes);
        //System.out.println("-- localtime -- " + time);

        final long millis = time.getMillisOfDay();
        //System.out.println("-- millis -- "+ millis);


        final Timestamp timestamp = new Timestamp(millis);

        //System.out.println("-- timestamp millis -- "+  timestamp.getTime());


        //System.out.println("-- timestamp -- " + timestamp);

        return timestamp;
    }

    public List<DefaultWorkingHours> getDefaultWorkingHours() {

        HashMap<Day, List<Integer>> onGoing = new HashMap<Day, List<Integer>>();
        List<DefaultWorkingHours> allHours = new ArrayList<DefaultWorkingHours>();

        if (hours == null) {
            return new ArrayList<DefaultWorkingHours>();
        }

        //order rows, data format is rather obscure..
        for (List<DefaultSlotDTO> row : hours) {
            for (DefaultSlotDTO cell : row) {
                Day day = Day.values()[cell.getDay()];
                List<Integer> hours = onGoing.get(day);
                if (hours == null) {
                    hours = new ArrayList<Integer>();
                    onGoing.put(day, hours);
                }
                hours.add(cell.getTime());
            }
        }

        System.out.println(onGoing);
        //loop for days
        for (Day day : Day.values()) {

            List<Integer> times = onGoing.get(day);
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
