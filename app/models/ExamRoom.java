package models;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import util.AppUtil;
import util.java.DateTimeUtils;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Entity
public class ExamRoom extends GeneratedIdentityModel {

    public enum State {ACTIVE, INACTIVE}

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

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    private List<ExamStartingHour> examStartingHours;

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
    private List<ExamMachine> examMachines;

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    private boolean expanded;

    private String localTimezone = AppUtil.getDefaultTimeZone().getID();

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
        return calendarExceptionEvents;
    }

    public void setCalendarExceptionEvents(List<ExceptionWorkingHours> calendarExceptionEvents) {
        this.calendarExceptionEvents = calendarExceptionEvents;
    }

    public List<ExamStartingHour> getExamStartingHours() {
        return examStartingHours;
    }

    public void setExamStartingHours(List<ExamStartingHour> examStartingHours) {
        this.examStartingHours = examStartingHours;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ExamRoom)) return false;

        ExamRoom examRoom = (ExamRoom) o;

        return !(id != null ? !id.equals(examRoom.id) : examRoom.id != null);

    }

    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }

    @Transient
    public int getTimezoneOffset(LocalDate date) {
        String day = date.dayOfWeek().getAsText(Locale.ENGLISH);
        for (DefaultWorkingHours defaultHour : defaultWorkingHours) {
            if (defaultHour.getDay().equalsIgnoreCase(day)) {
                return defaultHour.getTimezoneOffset();
            }
        }
        return 0;
    }

    @Transient
    private List<OpeningHours> getDefaultWorkingHours(LocalDate date) {
        String day = date.dayOfWeek().getAsText(Locale.ENGLISH);
        List<OpeningHours> hours = new ArrayList<>();
        defaultWorkingHours.stream().filter(dwh -> dwh.getDay().equalsIgnoreCase(day)).collect(Collectors.toList()).forEach(dwh -> {
            DateTime midnight = date.toDateTimeAtStartOfDay();
            DateTime start = midnight.withMillisOfDay((int) dwh.getStartTime().getTime());
            DateTime end = midnight.withMillisOfDay((int) dwh.getEndTime().getTime());
            Interval interval = new Interval(start.plusMillis(dwh.getTimezoneOffset()), end.plusMillis(dwh.getTimezoneOffset()));
            hours.add(new OpeningHours(interval, dwh.getTimezoneOffset()));
        });
        return hours;
    }


    @Transient
    public List<OpeningHours> getWorkingHoursForDate(LocalDate date) {
        List<OpeningHours> workingHours = getDefaultWorkingHours(date);
        List<Interval> extensionEvents = DateTimeUtils.mergeSlots(DateTimeUtils.getExceptionEvents(calendarExceptionEvents, date, false));
        List<Interval> restrictionEvents = DateTimeUtils.mergeSlots(DateTimeUtils.getExceptionEvents(calendarExceptionEvents, date, true));
        List<OpeningHours> availableHours = new ArrayList<>();
        if (!extensionEvents.isEmpty()) {
            List<Interval> unifiedIntervals = new ArrayList<>();
            for (OpeningHours oh : workingHours) {
                unifiedIntervals.add(oh.getHours());
            }
            unifiedIntervals.addAll(extensionEvents);
            unifiedIntervals = DateTimeUtils.mergeSlots(unifiedIntervals);
            int tzOffset;
            if (workingHours.isEmpty()) {
                tzOffset = DateTimeZone.forID(localTimezone).getOffset(new DateTime(date));
            } else {
                tzOffset = workingHours.get(0).timezoneOffset;
            }
            workingHours.clear();
            workingHours.addAll(unifiedIntervals.stream().map(
                    interval -> new OpeningHours(interval, tzOffset)).collect(Collectors.toList()));
        }
        if (!restrictionEvents.isEmpty()) {
            for (OpeningHours hours : workingHours) {
                Interval slot = hours.getHours();
                for (Interval gap : DateTimeUtils.findGaps(restrictionEvents, slot)) {
                    availableHours.add(new OpeningHours(gap, hours.getTimezoneOffset()));
                }
            }
        } else {
            availableHours = workingHours;
        }
        return availableHours;
    }

    public final class OpeningHours {
        private final Interval hours;
        private final int timezoneOffset;

        public OpeningHours(Interval interval, int timezoneOffset) {
            this.hours = interval;
            this.timezoneOffset = timezoneOffset;
        }

        public int getTimezoneOffset() {
            return timezoneOffset;
        }

        public Interval getHours() {
            return hours;
        }
    }

    public static final Find<Long, ExamRoom> find = new Find<Long, ExamRoom>() {
    };

}
