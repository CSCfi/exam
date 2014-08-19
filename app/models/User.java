package models;

import be.objectify.deadbolt.core.models.Permission;
import be.objectify.deadbolt.core.models.Role;
import be.objectify.deadbolt.core.models.Subject;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import play.db.ebean.Model;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "sitnet_users")
public class User extends Model implements Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private ShibbolethUser shibbolethUser;

    private String email;

    // used identify user
    private String eppn;

    private String lastName;

    private String firstName;

    private String password;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<SitnetRole> roles;

    @OneToOne
    private UserLanguage userLanguage;

    // Shibboleth attributes
    Map<String, String[]> attributes;

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

    @Column(columnDefinition="BOOLEAN DEFAULT FALSE")
    private boolean hasAcceptedUserAgreament = false;

    public boolean isHasAcceptedUserAgreament() {
        return hasAcceptedUserAgreament;
    }

    public void setHasAcceptedUserAgreament(boolean hasAcceptedUserAgreament) {
        this.hasAcceptedUserAgreament = hasAcceptedUserAgreament;
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

    public ShibbolethUser getShibbolethUser() {
        return shibbolethUser;
    }

    public void setShibbolethUser(ShibbolethUser shibbolethUser) {
        this.shibbolethUser = shibbolethUser;
    }

    public Map<String, String[]> getAttributes() {
        return attributes;
    }

    public void setAttributes(Map<String, String[]> attributes) {
        this.attributes = attributes;
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

    public void setRoles(List<SitnetRole> roles) {
        this.roles = roles;
    }

    @Override
    public List<? extends Role> getRoles() {
        if(roles == null)
            roles = new ArrayList();
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

        if(enrolments == null) {
            enrolments = new ArrayList<ExamEnrolment>();
        }
        return enrolments;
	}

	public void setEnrolments(List<ExamEnrolment> enrolments) {
		this.enrolments = enrolments;
	}

	public List<ExamParticipation> getParticipations() {

        if(participations == null) {
            participations = new ArrayList<ExamParticipation>();
        }
        return participations;
	}

	public void setParticipations(List<ExamParticipation> participations) {
		this.participations = participations;
	}

	public List<ExamInspection> getInspections() {

        if(inspections == null) {
            inspections = new ArrayList<ExamInspection>();
        }
        return inspections;
	}

	public void setInspections(List<ExamInspection> inspections) {
		this.inspections = inspections;
	}

	@Override
    public String getIdentifier() {
        return email;
    }

    public boolean hasRole(String name) {

        for (SitnetRole role : this.roles) {
            if(role.getName().equals(name))
                return true;
        }
        return false;
    }

    @Override
    public String toString() {
        return "User [id=" + id + ", email=" + email + ", name=" + lastName + " " +
                firstName + ", password=" + password + "]";
    }
}