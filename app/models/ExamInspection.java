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

    @OneToOne
	@JsonBackReference
	private User assignedBy;

    @OneToOne
    @JsonBackReference
    private Comment comment;

    private boolean ready;

    public boolean isReady() {
        return ready;
    }

    public void setReady(boolean ready) {
        this.ready = ready;
    }

    public Exam getExam() {
		return exam;
	}

	public Long getId() {
		return id;
	}

	public User getUser() {
		return user;
	}

    public User getAssignedBy() { return assignedBy; }

	public void setExam(Exam exam) {
		this.exam = exam;
	}
	
	public void setId(Long id) {
		this.id = id;
	}

	public void setUser(User user) {
		this.user = user;
	}

    public void setAssignedBy(User user) { this.assignedBy = user; }

    public Comment getComment() {
        return comment;
    }

    public void setComment(Comment comment) {
        this.comment = comment;
    }
}
