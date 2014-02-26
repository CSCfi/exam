package models;

import java.util.List;

import javax.persistence.*;

import play.db.ebean.Model;


/*
 * Opintojakso
 * http://tietomalli.csc.fi/Opintojakso-kaavio.html
 * 
 * 
 */
@Entity
public class Course extends Model {

	@Id
	@GeneratedValue(strategy=GenerationType.IDENTITY)
	private Long id;
	
	// Tiedekunta/Organisaatio
	private Organisation organisation;


	// Opintojakson koodi, 811380A 	Tietokantojen perusteet 
	private String code;

	private String name;
	
	// TODO: tänne tietoa
	private List<User> responsibleTeacher;

	private CourseType type;
	
	// Laajuus, opintopisteet
	private Double credits;
	
	public Course() {
		
	}
	
	public Course(String name) {
		super();
		this.name = name;
	}

	public String getCode() {
		return code;
	}

	
	public Double getCredits() {
		return credits;
	}


	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public Organisation getOrganisation() {
		return organisation;
	}

	public List<User> getResponsibleTeacher() {
		return responsibleTeacher;
	}

	public CourseType getType() {
		return type;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public void setCredits(Double credits) {
		this.credits = credits;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public void setName(String name) {
		this.name = name;
	}

	public void setOrganisation(Organisation organisation) {
		this.organisation = organisation;
	}

	public void setResponsibleTeacher(List<User> responsibleTeacher) {
		this.responsibleTeacher = responsibleTeacher;
	}

	public void setType(CourseType type) {
		this.type = type;
	}
	
}
