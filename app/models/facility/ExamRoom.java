// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import controllers.facility.RoomLike;
import io.ebean.Finder;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Transient;
import java.util.List;
import java.util.Set;
import models.base.GeneratedIdentityModel;
import models.calendar.DefaultWorkingHours;
import models.calendar.ExceptionWorkingHours;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

@Entity
public class ExamRoom extends GeneratedIdentityModel implements RoomLike {

    public enum State {
        ACTIVE,
        INACTIVE,
    }

    private String name;

    private String roomCode;

    private String buildingName;

    private String campus;

    private String externalRef;

    @OneToOne(cascade = CascadeType.ALL)
    private MailAddress mailAddress;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room", fetch = FetchType.EAGER)
    private Set<DefaultWorkingHours> defaultWorkingHours;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    @JsonManagedReference
    private Set<ExceptionWorkingHours> calendarExceptionEvents;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    private Set<ExamStartingHour> examStartingHours;

    // Accessibility info describes what accessibility issues there are regarding the room
    @ManyToMany(cascade = CascadeType.ALL, mappedBy = "examRoom")
    @JsonManagedReference
    private List<Accessibility> accessibilities;

    // Checkbox indicating is there any accessibility issues concerning the room
    private boolean accessible;

    private String roomInstruction;

    private String roomInstructionEN;

    private String roomInstructionSV;

    private String contactPerson;

    private String videoRecordingsURL;

    private String statusComment;

    private boolean outOfService;

    private String state;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "room")
    @JsonManagedReference
    private List<ExamMachine> examMachines;

    private String localTimezone;

    private String internalPassword;
    private String externalPassword;

    @Transient
    private boolean internalPasswordRequired;

    @Transient
    private boolean externalPasswordRequired;

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

    public Set<DefaultWorkingHours> getDefaultWorkingHours() {
        return defaultWorkingHours;
    }

    public void setDefaultWorkingHours(Set<DefaultWorkingHours> defaultWorkingHours) {
        this.defaultWorkingHours = defaultWorkingHours;
    }

    public Set<ExceptionWorkingHours> getCalendarExceptionEvents() {
        return calendarExceptionEvents;
    }

    public void setCalendarExceptionEvents(Set<ExceptionWorkingHours> calendarExceptionEvents) {
        this.calendarExceptionEvents = calendarExceptionEvents;
    }

    public Set<ExamStartingHour> getExamStartingHours() {
        return examStartingHours;
    }

    public void setExamStartingHours(Set<ExamStartingHour> examStartingHours) {
        this.examStartingHours = examStartingHours;
    }

    public List<Accessibility> getAccessibilities() {
        return accessibilities;
    }

    public void setAccessibilities(List<Accessibility> accessibilities) {
        this.accessibilities = accessibilities;
    }

    @Override
    public String getRoomInstruction() {
        return roomInstruction;
    }

    public void setRoomInstruction(String roomInstruction) {
        this.roomInstruction = roomInstruction;
    }

    @Override
    public String getRoomInstructionEN() {
        return roomInstructionEN;
    }

    public void setRoomInstructionEN(String roomInstructionEN) {
        this.roomInstructionEN = roomInstructionEN;
    }

    @Override
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

    public String getExternalRef() {
        return externalRef;
    }

    public void setExternalRef(String externalRef) {
        this.externalRef = externalRef;
    }

    public boolean getAccessible() {
        return accessible;
    }

    public void setAccessible(boolean accessible) {
        this.accessible = accessible;
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

    public String getInternalPassword() {
        return internalPassword;
    }

    public void setInternalPassword(String internalPassword) {
        this.internalPassword = internalPassword;
    }

    public String getExternalPassword() {
        return externalPassword;
    }

    public void setExternalPassword(String externalPassword) {
        this.externalPassword = externalPassword;
    }

    public boolean isInternalPasswordRequired() {
        return this.internalPasswordRequired;
    }

    public boolean isExternalPasswordRequired() {
        return this.externalPasswordRequired;
    }

    public void setInternalPasswordRequired(boolean internalPasswordRequired) {
        this.internalPasswordRequired = internalPasswordRequired;
    }

    public void setExternalPasswordRequired(boolean externalPasswordRequired) {
        this.externalPasswordRequired = externalPasswordRequired;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ExamRoom examRoom)) return false;
        return new EqualsBuilder().append(id, examRoom.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }

    public static final Finder<Long, ExamRoom> find = new Finder<>(ExamRoom.class);
}
