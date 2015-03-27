package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import play.db.ebean.Model;

import javax.annotation.Nonnull;
import javax.persistence.*;
import java.sql.Timestamp;
import java.util.Date;


@Entity
public class ExamEnrolment extends Model implements Comparable<ExamEnrolment> {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    
	@ManyToOne
	@JsonBackReference
	private User user;

	@ManyToOne
	@JsonBackReference
	private Exam exam;

    @OneToOne(cascade = CascadeType.REMOVE)
    private Reservation reservation;

	@Temporal(TemporalType.TIMESTAMP)
	private Date enrolledOn;

	
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

	public Date getEnrolledOn() {
		return enrolledOn;
	}

	public void setEnrolledOn(Date enrolledOn) {
		this.enrolledOn = enrolledOn;
	}

	public Exam getExam() {
		return exam;
	}

	public void setExam(Exam exam) {
		this.exam = exam;
	}

    public Reservation getReservation() {
        return reservation;
    }

    public void setReservation(Reservation reservation) {
        this.reservation = reservation;
    }

    @Override
    public int compareTo(@Nonnull ExamEnrolment other) {
        return enrolledOn.compareTo(other.enrolledOn);
    }
}
