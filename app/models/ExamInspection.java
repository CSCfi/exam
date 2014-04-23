package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import play.db.ebean.Model;

import javax.persistence.*;

@Entity
public class ExamInspection extends Model {

	/*
	 * Tämän luokan avulla voidaan löytää tentit jotka tentaattorin pitää tarkistaa
	 * 
	 * Mitä tähän luokkaan tulee?
	 * 
	 * Jos tähän ei tule muita attribuutteja kuin User ja Exam
	 * niin tämä on yksinkertainen ManyToMany relaatio
	 * 
	 * 
	 */
	
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    
    // RECURSION if inspector is same as creator 
    // through -> Exam.creator.inspections -> Exam.creator.inspections
    // Voidaanko tämä vältää jos sovitaan että tentin luoja on automaattisesti myös tarkastaja
    
	@OneToOne
	@JsonBackReference
	private Exam exam;

	@ManyToOne
	@JsonBackReference
	private User user;

	public Exam getExam() {
		return exam;
	}

	public Long getId() {
		return id;
	}

	public User getUser() {
		return user;
	}

	public void setExam(Exam exam) {
		this.exam = exam;
	}
	
	public void setId(Long id) {
		this.id = id;
	}

	public void setUser(User user) {
		this.user = user;
	}
	
}
