package models;

import java.util.ArrayList;
import java.util.List;

public class DayWithFreeTimes {
    private List<FreeTimeSlot> slots = new ArrayList<>();
    private String date;


    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public List<FreeTimeSlot> getSlots() {
        return slots;
    }

    public void setSlots(List<FreeTimeSlot> slots) {
        this.slots = slots;
    }
}
