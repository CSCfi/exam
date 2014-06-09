package models;

import java.sql.Timestamp;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

import com.fasterxml.jackson.annotation.JsonBackReference;

import play.db.ebean.Model;

@Entity
public class ExamParticipation extends Model {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    
	@ManyToOne
	@JsonBackReference
	private User user;

	@OneToOne
    @JsonBackReference
	private Exam exam;

	@Temporal(TemporalType.TIMESTAMP)
	private Timestamp started;
	
	@Temporal(TemporalType.TIMESTAMP)
	private Timestamp ended;
	
	

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

	public Exam getExam() {
		return exam;
	}

	public void setExam(Exam exam) {
		this.exam = exam;
	}

	public Timestamp getStarted() {
		return started;
	}

	public void setStarted(Timestamp started) {
		this.started = started;
	}

	public Timestamp getEnded() {
		return ended;
	}

	public void setEnded(Timestamp ended) {
		this.ended = ended;
	}
	
}
