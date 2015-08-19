package models;

import be.objectify.deadbolt.core.models.Permission;
import be.objectify.deadbolt.core.models.Subject;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.*;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "app_user")
public class User extends GeneratedIdentityModel implements Subject {

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
    private List<Role> roles;

    @ManyToOne
    @JoinColumn(name="language_id")
    private Language language;

    @OneToOne
    private Organisation organisation;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "user")
    @JsonManagedReference
    private List<ExamEnrolment> enrolments;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "user")
    @JsonManagedReference
    private List<ExamParticipation> participations;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "user")
    @JsonManagedReference
    private List<ExamInspection> inspections;

    public boolean isUserAgreementAccepted() {
        return userAgreementAccepted;
    }

    public void setUserAgreementAccepted(boolean userAgreementAccepted) {
        this.userAgreementAccepted = userAgreementAccepted;
    }

    @Column(columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean userAgreementAccepted;

    private Date lastLogin;

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

    public void setRoles(List<Role> roles) {
        this.roles = roles;
    }

    @Override
    public List<Role> getRoles() {
        return roles;
    }

    public Language getLanguage() {
        return language;
    }

    public void setLanguage(Language language) {
        this.language = language;
    }

    @Override
    public List<? extends Permission> getPermissions() {
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

    public Date getLastLogin() {
        return lastLogin;
    }

    public void setLastLogin(Date lastLogin) {
        this.lastLogin = lastLogin;
    }

    public boolean hasRole(String name) {

        for (Role role : roles) {
            if (role.getName().equals(name))
                return true;
        }
        return false;
    }

    @Override
    public String toString() {
        return "User [id=" + getId() + ", email=" + email + ", name=" + lastName + " " +
                firstName + ", password=" + password + "]";
    }

    @Override
    public boolean equals(Object other) {
        if (other == this) return true;
        if (!(other instanceof User)) return false;
        User otherUser = (User) other;
        return new EqualsBuilder().append(getId(), otherUser.getId()).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(getId()).build();
    }
}