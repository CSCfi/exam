package models;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import org.joda.time.DateTime;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.LocalTime;
import play.db.ebean.Model;
import util.SitnetUtil;

import javax.persistence.*;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Entity
public class ExamRoom extends Model {

    public enum State {ACTIVE, INACTIVE}

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String name;

    private String roomCode;

    private String buildingName;

    private String campus;

    @OneToOne
    private Organisation organization;

    @OneToOne(cascade = CascadeType.ALL)
    private MailAddress mailAddress = new MailAddress();

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

    // ExamRoom may be out of service,
    private String statusComment;

    @Column(columnDefinition = "boolean default false")
    private boolean outOfService;

    private String state;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    @JsonManagedReference
    private List<ExamMachine> examMachines = new ArrayList<>();

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    private boolean expanded;

    private String localTimezone = SitnetUtil.getDefaultTimeZone().getID();

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

    public String getLocalTimezone() {
        return localTimezone;
    }

    public void setLocalTimezone(String localTimezone) {
        this.localTimezone = localTimezone;
    }

    @Transient
    private Interval getExceptionEvent(LocalDate date) {

        for (ExceptionWorkingHours exception : calendarExceptionEvents) {

            boolean isTimeRange = exception.getEndDate() != null;
            boolean isClosedAllDay = exception.getStartTime() == null;
            DateTime startDate = new DateTime(exception.getStartDate()).withTimeAtStartOfDay();
            if (isTimeRange) {
                DateTime endDate = new DateTime(exception.getEndDate()).withTime(23, 59, 59, 999).toDateTime();
                Interval range = new Interval(startDate, endDate);
                if (!range.contains(date.toDateTimeAtStartOfDay())) {
                    continue;
                }
                if (isClosedAllDay) {
                    return zeroSecondInterval(date);
                } else {
                    return getInterval(date, exception);
                }
            } else {
                if (!startDate.toLocalDate().equals(date)) {
                    continue;
                }
                if (isClosedAllDay) {
                    return zeroSecondInterval(date);
                } else {
                    return getInterval(date, exception);
                }
            }
        }
        return null;
    }

    @Transient
    private Interval getInterval(LocalDate date, ExceptionWorkingHours exception) {
        LocalTime start = new LocalTime(exception.getStartTime().getTime()).withSecondOfMinute(0).withMillisOfSecond(0);
        LocalTime end = new LocalTime(exception.getEndTime().getTime()).withSecondOfMinute(0).withMillisOfSecond(0);
        return new Interval(date.toDateTime(start), date.toDateTime(end));
    }

    @Transient
    private Interval zeroSecondInterval(LocalDate date) {
        return new Interval(date.toDateTimeAtStartOfDay(), date.toDateTimeAtStartOfDay());
    }

    @Transient
    private List<Interval> getDefaultWorkingHours(LocalDate date) {
        String day = date.dayOfWeek().getAsText(Locale.ENGLISH);
        List<Interval> intervals = new ArrayList<>();
        for (DefaultWorkingHours defaultHour : defaultWorkingHours) {
            if (defaultHour.getDay().equalsIgnoreCase(day)) {
                LocalTime start = new LocalTime(defaultHour.getStartTime().getTime());
                LocalTime end = new LocalTime(defaultHour.getEndTime().getTime());
                Interval interval = new Interval(date.toDateTime(start), date.toDateTime(end));
                intervals.add(interval);
            }
        }
        return intervals;
    }

    @Transient
    public List<Interval> getWorkingHoursForDate(LocalDate date) {
        List<Interval> workingHours = getDefaultWorkingHours(date);
        Interval exceptionEvent = getExceptionEvent(date);
        List<Interval> availableHours = new ArrayList<>();
        if (exceptionEvent != null) {
            for (Interval slot : workingHours) {
                if (slot.overlaps(exceptionEvent)) {
                    if (slot.contains(exceptionEvent)) {
                        Interval first = new Interval(slot.getStart(), exceptionEvent.getStart());
                        if (first.toDurationMillis() > 0) {
                            availableHours.add(first);
                        }
                        Interval second = new Interval(exceptionEvent.getEnd(), slot.getEnd());
                        if (second.toDurationMillis() > 0) {
                            availableHours.add(second);
                        }
                    }
                    else if (slot.isBefore(exceptionEvent)) {
                        availableHours.add(new Interval(slot.getStart(), exceptionEvent.getStart()));
                    }
                    else if (slot.isAfter(exceptionEvent)) {
                        availableHours.add(new Interval(exceptionEvent.getEnd(), slot.getEnd()));
                    }
                }
            }
        } else {
            availableHours = workingHours;
        }
        return availableHours;
    }
}
