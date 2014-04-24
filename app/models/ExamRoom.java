package models;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.calendar.AbstractCalendarEvent;
import models.calendar.DefaultWorkingHours;
import play.db.ebean.Model;

import javax.persistence.*;
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
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

	private String name;

    private String roomCode;

    private String buildingName;

    private String campus;

    @OneToOne
    private Organisation organization;

    @OneToOne
    private MailAddress mailAddress;

    @OneToOne
    private DefaultWorkingHours calendarEvent;

    // Tentin siirtymäaika, oletuksena 5min, joka on pois tentin suoritusajasta, esim. 60min tentissä tenttiaikaa on 55min.
    private String transitionTime;

    // Accessibility info describes what accessibility issues there are regarding the room
    private String accessibilityInfo;

    // Checkbox indicating is there any accessibility issues concerning the room
    private Boolean accessible;

    // Tilaohjeet
    private String roomInstruction;

    // Vahtimestari tai muu yhteystieto esim. virkailija: (vapaaehtoinen)
    // tämä voisi olla myös Sitnet User, muuta ei välttämättä kannata
    private String contactPerson;

    private String videoRecordingsURL;

    private Long examMachineCount;

    // ExamRoom may be out of service,
    private String statusComment;

    private Boolean outOfService;

    private String state;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    @JsonManagedReference
    private List<ExamMachine> examMachines;

    // In UI, section has been expanded
    private Boolean expanded;

    public Boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(Boolean expanded) {
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

    public DefaultWorkingHours getCalendarEvent() {
        return calendarEvent;
    }

    public void setCalendarEvent(DefaultWorkingHours calendarEvent) {
        this.calendarEvent = calendarEvent;
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

    public Boolean getOutOfService() {
        return outOfService;
    }

    public void setOutOfService(Boolean outOfService) {
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

    public Boolean getAccessible() {
        return accessible;
    }

    public void setAccessible(Boolean accessible) {
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
}
