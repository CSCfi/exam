package models;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToMany;

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


	@Id
	@GeneratedValue(strategy=GenerationType.AUTO)
	private Long id;
	
	@ManyToMany()
	private Long uid;
	
	@Constraints.Required
	private String role;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Long getUid() {
		return uid;
	}

	public void setUid(Long uid) {
		this.uid = uid;
	}

	public String getRole() {
		return role;
	}

	public void setRole(String role) {
		this.role = role;
	}



}
