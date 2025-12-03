// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.user;

import be.objectify.deadbolt.java.models.Subject;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import models.assessment.ExamInspection;
import models.base.GeneratedIdentityModel;
import models.enrolment.ExamEnrolment;
import models.enrolment.ExamParticipation;
import models.facility.Organisation;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

@Entity
@Table(name = "app_user")
public class User extends GeneratedIdentityModel implements Subject {

    private String email;

    private String eppn;

    private String userIdentifier;

    private String lastName;

    private String firstName;

    @JsonIgnore
    private String password; // for dev-purposes only

    private String employeeNumber;

    private String logoutUrl;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<Role> roles;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<Permission> permissions;

    @ManyToOne
    @JoinColumn(name = "language_id")
    private Language language;

    @ManyToOne
    @JoinColumn(name = "organisation_id")
    private Organisation organisation;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "user")
    @JsonBackReference
    private List<ExamEnrolment> enrolments;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "user")
    @JsonBackReference
    private List<ExamParticipation> participations;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "user")
    @JsonBackReference
    private List<ExamInspection> inspections;

    @Transient
    private Role.Name loginRole;

    public boolean isUserAgreementAccepted() {
        return userAgreementAccepted;
    }

    public void setUserAgreementAccepted(boolean userAgreementAccepted) {
        this.userAgreementAccepted = userAgreementAccepted;
    }

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
    public List<Permission> getPermissions() {
        return permissions;
    }

    public void setPermissions(List<Permission> permissions) {
        this.permissions = permissions;
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

    public Date getLastLogin() {
        return lastLogin;
    }

    public void setLastLogin(Date lastLogin) {
        this.lastLogin = lastLogin;
    }

    public boolean hasRole(Role.Name... roles) {
        return Arrays.asList(roles).contains(loginRole);
    }

    public boolean isAdminOrSupport() {
        return hasRole(Role.Name.ADMIN, Role.Name.SUPPORT);
    }

    public boolean hasPermission(Permission.Type type) {
        return permissions.stream().map(Permission::getType).toList().contains(type);
    }

    public Role.Name getLoginRole() {
        return loginRole;
    }

    public void setLoginRole(Role.Name loginRole) {
        this.loginRole = loginRole;
    }

    @Override
    public String toString() {
        return (
            "User [id=" +
            getId() +
            ", email=" +
            email +
            ", name=" +
            lastName +
            " " +
            firstName +
            ", password=" +
            password +
            "]"
        );
    }

    @Override
    public boolean equals(Object other) {
        if (other == this) return true;
        if (!(other instanceof User otherUser)) return false;
        return new EqualsBuilder().append(getId(), otherUser.getId()).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(getId()).build();
    }
}
