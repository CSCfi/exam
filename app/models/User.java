package models;

import java.util.List;

import javax.persistence.*;

import play.data.format.Formats;
import play.data.validation.Constraints;
import play.db.ebean.Model;

@Entity
public class User extends Model {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @Constraints.Required
    @Formats.NonEmpty
    private String email;

    @Constraints.Required
    private String lastName;

    @Constraints.Required
    private String firstName;

    @Constraints.Required
    private String password;

    @OneToMany(cascade = CascadeType.ALL)
    private List<Role> roles;

    @ManyToOne
    private UserLanguage userLanguage;
    
    

    public UserLanguage getUserLanguage() {
		return userLanguage;
	}

	public void setUserLanguage(UserLanguage userLanguage) {
		this.userLanguage = userLanguage;
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

    public List<Role> getRoles() {
        return roles;
    }

    public void setRoles(List<Role> roles) {
        this.roles = roles;
    }

    @Override
    public String toString() {
        return "User [id=" + id + ", email=" + email + ", name=" + lastName + " " +
                firstName + ", password=" + password + "]";
    }


}