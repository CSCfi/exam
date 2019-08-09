/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.models;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Transient;

import be.objectify.deadbolt.java.models.Subject;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import backend.models.base.GeneratedIdentityModel;

@Entity
@Table(name = "app_user")
public class User extends GeneratedIdentityModel implements Subject {

    private String email;

    private String eppn;

    private String userIdentifier;

    private String lastName;

    private String firstName;

    @JsonIgnore
    private String password;

    private String employeeNumber;

    private String logoutUrl;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<Role> roles;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<Permission> permissions;

    @ManyToOne
    @JoinColumn(name="language_id")
    private Language language;

    @ManyToOne
    @JoinColumn(name="organisation_id")
    private Organisation organisation;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "user")
    @JsonManagedReference
    private List<ExamEnrolment> enrolments;

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "user")
    @JsonManagedReference
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
    public List<Permission> getPermissions() {
        return permissions;
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

    public boolean hasRole(Role.Name name) {
        return loginRole == name;
    }

    public boolean hasPermission(Permission.Type type) {
        return permissions.stream().map(Permission::getType).collect(Collectors.toList()).contains(type);
    }

    public Role.Name getLoginRole() {
        return loginRole;
    }

    public void setLoginRole(Role.Name loginRole) {
        this.loginRole = loginRole;
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
