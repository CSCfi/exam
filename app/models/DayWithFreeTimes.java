package models;

import java.util.ArrayList;

public class DayWithFreeTimes {
    private ArrayList<FreeTimeSlot> slots = new ArrayList<FreeTimeSlot>();
    private String date;


    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public ArrayList<FreeTimeSlot> getSlots() {
        return slots;
    }

    public void setSlots(ArrayList<FreeTimeSlot> slots) {
        this.slots = slots;
    }
}
