package models;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import org.joda.time.DateTimeConstants;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.LocalTime;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import play.db.ebean.Model;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/*
 * Huoneisto ja tila
 * http://tietomalli.csc.fi/Huoneisto%20ja%20tila-kaavio.html
 * 
 * Tenttiakvaario
 * 
 */
@Entity
public class ExamRoom extends Model {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String roomCode;

    private String buildingName;

    private String campus;

    @OneToOne
    private Organisation organization;

    @OneToOne
    private MailAddress mailAddress;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room", fetch = FetchType.EAGER)
    private List<DefaultWorkingHours> defaultWorkingHours;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    @JsonManagedReference
    private List<ExceptionWorkingHours> calendarExceptionEvents;

    // Tentin siirtymäaika, oletuksena 5min, joka on pois tentin suoritusajasta, esim. 60min tentissä tenttiaikaa on 55min.
    private String transitionTime;

    // Accessibility info describes what accessibility issues there are regarding the room
    @ManyToMany(cascade = CascadeType.ALL, mappedBy = "examRoom")
    @JsonManagedReference
    private List<Accessibility> accessibility;

    // Checkbox indicating is there any accessibility issues concerning the room
    @Column(columnDefinition = "boolean default false")
    private boolean accessible;

    // Tilaohjeet
    @Column(columnDefinition = "TEXT")
    private String roomInstruction;

    // Tilaohjeet
    @Column(columnDefinition = "TEXT")
    private String roomInstructionEN;

    // Tilaohjeet
    @Column(columnDefinition = "TEXT")
    private String roomInstructionSV;

    // Vahtimestari tai muu yhteystieto esim. virkailija: (vapaaehtoinen)
    // tämä voisi olla myös Sitnet User, muuta ei välttämättä kannata
    private String contactPerson;

    private String videoRecordingsURL;

    private Long examMachineCount;

    // ExamRoom may be out of service,
    private String statusComment;

    @Column(columnDefinition = "boolean default false")
    private boolean outOfService;

    private String state;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    @JsonManagedReference
    private List<ExamMachine> examMachines;

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    private boolean expanded;

    private static DateTimeFormatter format = DateTimeFormat.forPattern("HHmm");

    @Column(columnDefinition = "boolean default false")
    public boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(boolean expanded) {
        this.expanded = expanded;
    }

    public String getBuildingName() {
        return buildingName;
    }

    public void setBuildingName(String buildingName) {
        this.buildingName = buildingName;
    }

    public MailAddress getMailAddress() {
        return mailAddress;
    }

    public void setMailAddress(MailAddress mailAddress) {
        this.mailAddress = mailAddress;
    }

    public List<DefaultWorkingHours> getDefaultWorkingHours() {
        return defaultWorkingHours;
    }

    public void setDefaultWorkingHours(List<DefaultWorkingHours> defaultWorkingHours) {
        this.defaultWorkingHours = defaultWorkingHours;
    }

    public List<ExceptionWorkingHours> getCalendarExceptionEvents() {
        if (calendarExceptionEvents == null) {
            calendarExceptionEvents = new ArrayList<ExceptionWorkingHours>();
        }
        return calendarExceptionEvents;
    }

    public void setCalendarExceptionEvents(List<ExceptionWorkingHours> calendarExceptionEvents) {
        this.calendarExceptionEvents = calendarExceptionEvents;
    }

    public List<Accessibility> getAccessibility() {
        return accessibility;
    }

    public void setAccessibility(List<Accessibility> accessibility) {
        this.accessibility = accessibility;
    }

    public String getRoomInstruction() {
        return roomInstruction;
    }

    public void setRoomInstruction(String roomInstruction) {
        this.roomInstruction = roomInstruction;
    }

    public String getRoomInstructionEN() {
        return roomInstructionEN;
    }

    public void setRoomInstructionEN(String roomInstructionEN) {
        this.roomInstructionEN = roomInstructionEN;
    }

    public String getRoomInstructionSV() {
        return roomInstructionSV;
    }

    public void setRoomInstructionSV(String roomInstructionSV) {
        this.roomInstructionSV = roomInstructionSV;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
    }

    public Long getExamMachineCount() {
        examMachineCount = new Long(examMachines.size());
        return examMachineCount;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<ExamMachine> getExamMachines() {
        return examMachines;
    }

    public void setExamMachines(List<ExamMachine> examMachines) {
        this.examMachines = examMachines;
    }

    public boolean getOutOfService() {
        return outOfService;
    }

    public void setOutOfService(boolean outOfService) {
        this.outOfService = outOfService;
    }

    public String getStatusComment() {
        return statusComment;
    }

    public void setStatusComment(String statusComment) {
        this.statusComment = statusComment;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getCampus() {
        return campus;
    }

    public void setCampus(String campus) {
        this.campus = campus;
    }

    public Organisation getOrganization() {
        return organization;
    }

    public void setOrganization(Organisation organization) {
        this.organization = organization;
    }

    public boolean getAccessible() {
        return accessible;
    }

    public void setAccessible(boolean accessible) {
        this.accessible = accessible;
    }

    public String getTransitionTime() {
        return transitionTime;
    }

    public void setTransitionTime(String transitionTime) {
        this.transitionTime = transitionTime;
    }

    public String getVideoRecordingsURL() {
        return videoRecordingsURL;
    }

    public void setVideoRecordingsURL(String videoRecordingsURL) {
        this.videoRecordingsURL = videoRecordingsURL;
    }


    @Transient
    private String getWeekDay(LocalDate date) {
        switch (date.getDayOfWeek()) {
            case DateTimeConstants.MONDAY:
                return DefaultWorkingHours.Day.MONDAY.toString();
            case DateTimeConstants.TUESDAY:
                return DefaultWorkingHours.Day.TUESDAY.toString();
            case DateTimeConstants.WEDNESDAY:
                return DefaultWorkingHours.Day.WEDNESDAY.toString();
            case DateTimeConstants.THURSDAY:
                return DefaultWorkingHours.Day.THURSDAY.toString();
            case DateTimeConstants.FRIDAY:
                return DefaultWorkingHours.Day.FRIDAY.toString();
            case DateTimeConstants.SATURDAY:
                return DefaultWorkingHours.Day.SATURDAY.toString();
            case DateTimeConstants.SUNDAY:
                return DefaultWorkingHours.Day.SUNDAY.toString();
        }
        return "";
    }

    @Transient
    private Interval getFromExceptionEvents(LocalDate date) {

        for (ExceptionWorkingHours exception : calendarExceptionEvents) {
            final LocalDate startDate = new LocalDate(exception.getStartDate());
            final LocalTime start;
            final LocalTime end;

            if (exception.getEndDate() == null) {
                if (startDate.equals(date)) {
                    if (exception.getStartTime() == null) {
                        start = new LocalTime(exception.getStartTime().getTime());
                        end = new LocalTime(exception.getEndTime().getTime());
                    } else {
                        start = LocalTime.fromMillisOfDay(0);
                        end = LocalTime.MIDNIGHT;
                    }
                    return new Interval(date.toDateTime(start), date.toDateTime(end));
                }
            } else {
                final LocalDate endDate = new LocalDate(exception.getEndDate().getTime());
                if (startDate.equals(date)) {
                    if (exception.getStartTime() == null) {
                        start = new LocalTime(exception.getStartTime().getTime());
                        end = new LocalTime(exception.getEndTime().getTime());
                    } else {
                        start = LocalTime.fromMillisOfDay(0);
                        end = LocalTime.MIDNIGHT;
                    }
                    return new Interval(startDate.toDateTime(start), endDate.toDateTime(end));
                }
            }
        }
        return null;
    }

    @Transient
    private List<Interval> getFromDefaultHours(LocalDate date) {
        String day = getWeekDay(date);
        final List<Interval> intervals = new ArrayList<Interval>();
        for(DefaultWorkingHours defaultHour : this.defaultWorkingHours) {
            if(defaultHour.getDay().equals(day)) {
                final LocalTime start = new LocalTime(defaultHour.getStartTime().getTime());
                final LocalTime end = new LocalTime(defaultHour.getEndTime().getTime());
                Interval interval = new Interval(date.toDateTime(start),date.toDateTime(end));
                intervals.add(interval);
            }
        }
        return intervals;
    }

    @Transient
    public List<Interval> getWorkingHoursForDate(LocalDate date) {
        final Interval exceptionEvents = getFromExceptionEvents(date);

        if(exceptionEvents != null) {
            return Arrays.asList(exceptionEvents);
        }
        return getFromDefaultHours(date);
    }
}
