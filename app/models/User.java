package models;

import be.objectify.deadbolt.core.models.Permission;
import be.objectify.deadbolt.core.models.Role;
import be.objectify.deadbolt.core.models.Subject;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import play.db.ebean.Model;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sitnet_users")
public class User extends Model implements Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

//    @Constraints.Required
//    @Formats.NonEmpty
    private String email;

//    @Constraints.Required
    private String lastName;

//    @Constraints.Required
    private String firstName;

//    @Constraints.Required
    private String password;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<SitnetRole> roles;

    @OneToOne
    private UserLanguage userLanguage;
    
    
    
    
    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "user")
    @JsonManagedReference
    private List<ExamEnrolment> enrolments;
    
    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "user")
    @JsonManagedReference
    private List<ExamParticipation> participations;
    
    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "user")
    @JsonManagedReference
    private List<ExamInspection> inspections;
    
    
    
    
    
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

    public void setRoles(List<SitnetRole> roles) {
        this.roles = roles;
    }

    @Override
    public List<? extends Role> getRoles() {
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

    @Override
    public String toString() {
        return "User [id=" + id + ", email=" + email + ", name=" + lastName + " " +
                firstName + ", password=" + password + "]";
    }
}