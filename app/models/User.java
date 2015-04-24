package models;

import be.objectify.deadbolt.core.models.Permission;
import be.objectify.deadbolt.core.models.Subject;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import org.apache.commons.lang3.builder.EqualsBuilder;
import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sitnet_users")
public class User extends Model implements Subject {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String email;

    // used identify user
    private String eppn;

    // schacPersonalUniqueCode
    private String userIdentifier;

    private String lastName;

    private String firstName;

    private String password;

    private String employeeNumber;

    private String logoutUrl;

    @ManyToMany(cascade = CascadeType.ALL, mappedBy = "examOwners")
    @JoinTable(name = "exam_owner", joinColumns = @JoinColumn(name = "user_id"))
    @JsonBackReference
    private List<Exam> ownedExams;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<SitnetRole> roles = new ArrayList<>();

    @OneToOne
    private UserLanguage userLanguage;

    @OneToOne
    private Organisation organisation;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "user")
    @JsonManagedReference
    private List<ExamEnrolment> enrolments = new ArrayList<>();

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "user")
    @JsonManagedReference
    private List<ExamParticipation> participations = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "user")
    @JsonManagedReference
    private List<ExamInspection> inspections = new ArrayList<>();

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean hasAcceptedUserAgreament;


    public boolean isHasAcceptedUserAgreament() {
        return hasAcceptedUserAgreament;
    }

    public void setHasAcceptedUserAgreament(boolean hasAcceptedUserAgreament) {
        this.hasAcceptedUserAgreament = hasAcceptedUserAgreament;
    }

    public String getEmployeeNumber() {
        return employeeNumber;
    }

    public void setEmployeeNumber(String employeeNumber) {
        this.employeeNumber = employeeNumber;
    }

    public String getUserIdentifier() {
        return userIdentifier;
    }

    public void setUserIdentifier(String userIdentifier) {
        this.userIdentifier = userIdentifier;
    }

    public String getEppn() {
        return eppn;
    }

    public void setEppn(String eppn) {
        this.eppn = eppn;
    }

    public Organisation getOrganisation() {
        return organisation;
    }

    public void setOrganisation(Organisation organisation) {
        this.organisation = organisation;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getLogoutUrl() {
        return logoutUrl;
    }

    public void setLogoutUrl(String logoutUrl) {
        this.logoutUrl = logoutUrl;
    }

    public void setRoles(List<SitnetRole> roles) {
        this.roles = roles;
    }

    @Override
    public List<SitnetRole> getRoles() {
        return roles;
    }

    public UserLanguage getUserLanguage() {
        return userLanguage;
    }

    public void setUserLanguage(UserLanguage userLanguage) {
        this.userLanguage = userLanguage;
    }

    @Override
    public List<? extends Permission> getPermissions() {

        // TODO: return null
        return null;
    }

    public List<ExamEnrolment> getEnrolments() {
        return enrolments;
    }

    public void setEnrolments(List<ExamEnrolment> enrolments) {
        this.enrolments = enrolments;
    }

    public List<ExamParticipation> getParticipations() {
        return participations;
    }

    public void setParticipations(List<ExamParticipation> participations) {
        this.participations = participations;
    }

    public List<ExamInspection> getInspections() {
        return inspections;
    }

    public void setInspections(List<ExamInspection> inspections) {
        this.inspections = inspections;
    }

    @Override
    public String getIdentifier() {
        return email;
    }

    public List<Exam> getOwnedExams() {
        return ownedExams;
    }

    public void setOwnedExams(List<Exam> ownedExams) {
        this.ownedExams = ownedExams;
    }

    public boolean hasRole(String name) {

        for (SitnetRole role : roles) {
            if (role.getName().equals(name))
                return true;
        }
        return false;
    }

    @Override
    public String toString() {
        return "User [id=" + id + ", email=" + email + ", name=" + lastName + " " +
                firstName + ", password=" + password + "]";
    }

    @Override
    public boolean equals(Object other) {
        if (other == this) return true;
        if (!(other instanceof User)) return false;
        User otherUser = (User) other;
        return new EqualsBuilder().append(id, otherUser.id).build();
    }
}