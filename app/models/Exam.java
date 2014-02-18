package models;

import java.util.List;

import javax.persistence.Entity;

/*
 * HUOM tämä luokka ei ole Tentin toteutus, vaan tentin tietomalli
 * 
 * Kuvaa Sitnettiin tallennettavan tentin rakenteen
 * 
 */
@Entity
public class Exam extends SitnetModel {

	// Tentti liittyy Opintojaksoon
	private Course course;	
	
	// onko tentillä joku toinen nimi, Opintojakson nimen lisäksi
	private String name;
	
	private ExamType examType;
	
	// Opettajan antama ohje Opiskelijalle tentin suorittamista varten
	private String instruction;
	
	private boolean shared;
	
	private List<ExamSection> examSections;

	public Exam(User creator, String name) {
		super(creator);
		this.name = name;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public ExamType getExamType() {
		return examType;
	}

	public void setExamType(ExamType examType) {
		this.examType = examType;
	}

	public List<ExamSection> getExamSections() {
		return examSections;
	}

	public void setExamSections(List<ExamSection> examSections) {
		this.examSections = examSections;
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
