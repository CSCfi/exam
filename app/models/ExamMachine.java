package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.base.GeneratedIdentityModel;
import org.joda.time.Interval;

import javax.persistence.*;
import java.util.List;

@Entity
public class ExamMachine extends GeneratedIdentityModel {

    private String name;

    private String otherIdentifier;

    @Deprecated
    private String accessibilityInfo;

    // Checkbox indicating is there any accessibility issues concerning the room
    @Column(columnDefinition = "boolean default false")
    @Deprecated
    private boolean accessible;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<Software> softwareInfo;

    @ManyToMany(cascade = CascadeType.ALL)
    @JsonManagedReference
    private List<Accessibility> accessibility;

    private String ipAddress;

    private String surveillanceCamera;

    private String videoRecordings;

    @ManyToOne
    @JsonBackReference
    private ExamRoom room;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "machine")
    @JsonManagedReference
    private List<Reservation> reservations;

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    private boolean expanded;

    // Machine may be out of service,
    private String statusComment;

    private boolean archived;

    private boolean outOfService;

    public boolean isArchived() {
        return archived;
    }

    public void setArchived(boolean archived) {
        this.archived = archived;
    }

    public boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(boolean expanded) {
        this.expanded = expanded;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ExamRoom getRoom() {
        return room;
    }

    public void setRoom(ExamRoom room) {
        this.room = room;
    }

    public List<Reservation> getReservations() {
        return reservations;
    }

    public String getAccessibilityInfo() {
        return accessibilityInfo;
    }

    public void setAccessibilityInfo(String accessibilityInfo) {
        this.accessibilityInfo = accessibilityInfo;
    }

    public boolean isAccessible() {
        return accessible;
    }

    public void setAccessible(boolean accessible) {
        this.accessible = accessible;
    }

    public List<Software> getSoftwareInfo() {
        return softwareInfo;
    }

    public void setSoftwareInfo(List<Software> softwareInfo) {
        this.softwareInfo = softwareInfo;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public String getStatusComment() {
        return statusComment;
    }

    public void setStatusComment(String statusComment) {
        this.statusComment = statusComment;
    }

    public boolean getOutOfService() {
        return outOfService;
    }

    public void setOutOfService(boolean outOfService) {
        this.outOfService = outOfService;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public void setReservations(List<Reservation> reservations) {
        this.reservations = reservations;
    }

    public String getOtherIdentifier() {
        return otherIdentifier;
    }

    public void setOtherIdentifier(String otherIdentifier) {
        this.otherIdentifier = otherIdentifier;
    }

    public String getSurveillanceCamera() {
        return surveillanceCamera;
    }

    public void setSurveillanceCamera(String surveillanceCamera) {
        this.surveillanceCamera = surveillanceCamera;
    }

    public String getVideoRecordings() {
        return videoRecordings;
    }

    public void setVideoRecordings(String videoRecordings) {
        this.videoRecordings = videoRecordings;
    }

    public List<Accessibility> getAccessibility() {
        return accessibility;
    }

    public void setAccessibility(List<Accessibility> accessibility) {
        this.accessibility = accessibility;
    }

    @Transient
    public boolean hasRequiredSoftware(Exam exam) {
        return softwareInfo.containsAll(exam.getSoftwareInfo());
    }

    @Transient
    public boolean isReservedDuring(Interval interval) {
        return reservations.stream()
                .anyMatch(r -> interval.overlaps(r.toInterval()));
    }

    @Override
    public String toString() {
        return "ExamMachine{ id=" + getId() + ", name=" + name + " }";
    }
}
