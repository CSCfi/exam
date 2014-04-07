package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
public class ExamEnrolment extends Model {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    
	@ManyToOne
	@JsonBackReference
	private User user;

	// Kun opiskelija aloittaa tentin tämä viite setataan kopioon
    // ja lisätään Userille ExamParticipation
	@OneToOne
	private Exam exam;

	@Temporal(TemporalType.TIMESTAMP)
	private Timestamp enrolledOn;
	
	
	
	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public User getUser() {
		return user;
	}

	public void setUser(User user) {
		this.user = user;
	}

	public Timestamp getEnrolledOn() {
		return enrolledOn;
	}

	public void setEnrolledOn(Timestamp enrolledOn) {
		this.enrolledOn = enrolledOn;
	}

	public Exam getExam() {
		return exam;
	}

	public void setExam(Exam exam) {
		this.exam = exam;
	}
	
}
