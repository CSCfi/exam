package models;


import java.util.Date;
import java.util.List;

public final class FreeTimeSlot {

    private Long room;
    private List<String> machine;
    private Date start;
    private Date end;
    private String title;


    public FreeTimeSlot(Date start, Date end, List<String> machine, Long room, String title) {
        this.end = end;
        this.machine = machine;
        this.room = room;
        this.start = start;
        this.title = title;
    }

    public Date getEnd() {
        return end;
    }

    public List<String> getMachine() {
        return machine;
    }

    public Long getRoom() {
        return room;
    }

    public Date getStart() {
        return start;
    }

    public String getTitle() {
        return title;
    }
}