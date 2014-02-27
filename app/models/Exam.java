package models;

import java.util.List;

import javax.persistence.*;

import play.data.validation.Constraints;

/*
 * HUOM tämä luokka ei ole Tentin toteutus, vaan tentin tietomalli
 * 
 * Kuvaa Sitnettiin tallennettavan tentin rakenteen
 * 
 */
@Entity
public class Exam extends SitnetModel {

	// Tentti liittyy Opintojaksoon
	@ManyToOne
	private Course course;	
	
	// onko tentillä joku toinen nimi, Opintojakson nimen lisäksi
	private String name;
	
	private ExamType examType;
	
	// Opettajan antama ohje Opiskelijalle tentin suorittamista varten
	private String instruction;
	
	private boolean shared;
	
	
	// TODO: This should be actually @OneToMany relationship, but there's problems with Ebean
	// XXX: Help
	
//	@OneToMany(cascade = CascadeType.REMOVE, mappedBy="exam")
//	@OneToMany(cascade = CascadeType.ALL, mappedBy="exam")
	@ManyToMany(cascade = CascadeType.PERSIST)
	private List<ExamSection> examSections;


    @OneToOne
    private ExamEvent examEvent;


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

    public ExamEvent getExamEvent() {
        return examEvent;
    }

    public void setExamEvent(ExamEvent examEvent) {
        this.examEvent = examEvent;
    }
	public void setCourse(Course course) {
		this.course = course;
	}

    @Override
    public String toString() {
        return "Exam{" +
                "course=" + course +
                ", name='" + name + '\'' +
                ", examType=" + examType +
                ", instruction='" + instruction + '\'' +
                ", shared=" + shared +
                ", examSections=" + examSections +
                '}';
    }
}
