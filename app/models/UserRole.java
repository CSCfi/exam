package models;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;

import play.data.validation.Constraints;
import play.db.ebean.Model;

@Entity
public class UserRole extends Model {

	private static final long serialVersionUID = 1L;

	//	@EnumMapping(nameValuePairs="ADMIN=1, STUDENT=2, TEACHER=3")
	public static enum ROLE {
//		@EnumValue("1")
		ADMIN,
//		@EnumValue("2")
		STUDENT,
//		@EnumValue("3")
		TEACHER
	};
	
	@ManyToOne
	private User user;
	
	@Constraints.Required
	private String role;

	public String getRole() {
		return role;
	}

	public void setRole(String role) {
		this.role = role;
	}



}
