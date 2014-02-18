package models;

import java.util.List;

import javax.persistence.Entity;

import play.db.ebean.Model;


/*
 * Opintojakso
 * http://tietomalli.csc.fi/Opintojakso-kaavio.html
 * 
 * 
 */
@Entity
public class Course extends Model {


	// Tiedekunta/Organisaatio
	private String facultyOrOrganizationName;
	
	// Opintojakson koodi, 811380A 	Tietokantojen perusteet 
	private String code;
	
	private String name;
	
	
	// TODO: tänne tietoa
	private List<User> responsibleTeacher;
	
	private CourseType type;
	
	// Laajuus, opintopisteet
	private Double credits;


	public String getCode() {
		return code;
	}

	public void setCode(String code) {
		this.code = code;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public CourseType getType() {
		return type;
	}

	public void setType(CourseType type) {
		this.type = type;
	}

	public Double getCredits() {
		return credits;
	}

	public void setCredits(Double credits) {
		this.credits = credits;
	}

	public String getFacultyOrOrganizationName() {
		return facultyOrOrganizationName;
	}

	public void setFacultyOrOrganizationName(String facultyOrOrganizationName) {
		this.facultyOrOrganizationName = facultyOrOrganizationName;
	}

	public List<User> getResponsibleTeacher() {
		return responsibleTeacher;
	}

	public void setResponsibleTeacher(List<User> responsibleTeacher) {
		this.responsibleTeacher = responsibleTeacher;
	}
	
}
