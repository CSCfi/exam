package models;

import be.objectify.deadbolt.core.models.*;
import be.objectify.deadbolt.core.models.Role;
import play.data.format.Formats;
import play.db.ebean.Model;

import javax.persistence.*;
import java.util.List;

@Entity
@Table(name = "users")
public class User extends Model implements Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

//    @Constraints.Required
    @Formats.NonEmpty
    private String email;

//    @Constraints.Required
    private String lastName;

//    @Constraints.Required
    private String firstName;

//    @Constraints.Required
    private String password;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<SitnetRole> roles;

    @ManyToOne
    private UserLanguage userLanguage;

//    private List<EnrolledExam> enrolledExams;

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

//    public List<EnrolledExam> getEnrolledExams() {
//        return enrolledExams;
//    }
//
//    public void setEnrolledExams(List<EnrolledExam> enrolledExams) {
//        this.enrolledExams = enrolledExams;
//    }

    @Override
    public List<? extends Permission> getPermissions() {

        // TODO: return null
        return null;
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