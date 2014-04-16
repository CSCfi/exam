package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import play.db.ebean.Model;

import javax.persistence.*;

/*
 * Tenttikone jolla opiskelija tekee tentin
 * Kone sijaitsee Tenttiakvaariossa
 * 
 */
@Entity
public class ExamMachine extends Model {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

    /*
     * jonkinlainen ID jolla kone tunnistetaan
     *
     * Esim akvaario-koneenID  IT103-7
     */
    private String name;

    // Esteettömyystieto
    private String accessibilityInfo;

    // Ohjelmistot
    private String softwareInfo;

    private String ipAddress;

    @ManyToOne
    @JsonBackReference
	private ExamRoom room;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "machine")
    @JsonManagedReference
    private Reservation reservation;

    // In UI, section has been expanded
    private Boolean expanded;

    // Machine may be out of service,
    private String statusComment;

    private boolean outOfService;

    public Boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(Boolean expanded) {
        this.expanded = expanded;
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

    public ExamRoom getRoom() {
        return room;
    }

    public void setRoom(ExamRoom room) {
        this.room = room;
    }

    public Reservation getReservation() {
        return reservation;
    }

    public String getAccessibilityInfo() {
        return accessibilityInfo;
    }

    public void setAccessibilityInfo(String accessibilityInfo) {
        this.accessibilityInfo = accessibilityInfo;
    }

    public String getSoftwareInfo() {
        return softwareInfo;
    }

    public void setSoftwareInfo(String softwareInfo) {
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

    public Boolean getOutOfService() {
        return outOfService;
    }

    public void setOutOfService(Boolean outOfService) {
        this.outOfService = outOfService;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public void setReservation(Reservation reservation) {
        this.reservation = reservation;
    }
}
