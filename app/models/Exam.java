package models;

import java.util.List;

/*
 * HUOM tämä luokka ei ole Tentin toteutus, vaan tentin tietomalli
 * 
 */
public class Exam extends SitnetModel {

	
	
	private String name;
	
	// Opettajan antama ohje tentin suoittamista varten
	private String instruction;
	
	private boolean shared;
	
	private List<ExamSection> examSections;

	// Tentti liittyy Opintojaksoon
	private Course course;
	

	public Exam(User creator, String name, Course course) {
		super(creator);
		this.name = name;
		this.course = course;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getInstruction() {
		return instruction;
	}

	public void setInstruction(String instruction) {
		this.instruction = instruction;
	}

	public boolean isShared() {
		return shared;
	}

	public void setShared(boolean shared) {
		this.shared = shared;
	}

	public Course getCourse() {
		return course;
	}

	public void setCourse(Course course) {
		this.course = course;
	}
	
	
}
