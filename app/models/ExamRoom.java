package models;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import org.joda.time.LocalDate;
import play.db.ebean.Model;

import javax.persistence.*;
import java.util.ArrayList;
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
    private List<DefaultWorkingHours> defaultWorkingHourses;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    @JsonManagedReference
    private List<ExceptionWorkingHours> calendarExceptionEvents;

    // Tentin siirtymäaika, oletuksena 5min, joka on pois tentin suoritusajasta, esim. 60min tentissä tenttiaikaa on 55min.
    private String transitionTime;

    // Accessibility info describes what accessibility issues there are regarding the room
    private String accessibilityInfo;

    // Checkbox indicating is there any accessibility issues concerning the room
    @Column(columnDefinition = "boolean default false")
    private boolean accessible;

    // Tilaohjeet
    private String roomInstruction;

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

    public List<DefaultWorkingHours> getDefaultWorkingHourses() {
        return defaultWorkingHourses;
    }

    public void setDefaultWorkingHourses(List<DefaultWorkingHours> defaultWorkingHourses) {
        this.defaultWorkingHourses = defaultWorkingHourses;
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

    public String getAccessibilityInfo() {
        return accessibilityInfo;
    }

    public void setAccessibilityInfo(String accessibilityInfo) {
        this.accessibilityInfo = accessibilityInfo;
    }

    public String getRoomInstruction() {
        return roomInstruction;
    }

    public void setRoomInstruction(String roomInstruction) {
        this.roomInstruction = roomInstruction;
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
    public DefaultWorkingHours getWorkingHoursForDate(LocalDate localDate) {
        /*
        for (DefaultWorkingHours defaultHours : defaultWorkingHourses) {

            if (defaultHours.getDateTimeForDay(localDate).isEmpty()) {
                continue;
            }

            //todo: miikka

        }

        for (ExceptionWorkingHours exceptionHours : calendarExceptionEvents) {

        }

          */
        return null;

    }
}
