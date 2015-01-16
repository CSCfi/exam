package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import play.db.ebean.Model;

import javax.persistence.*;
import java.util.Date;

@Entity
public class ExamParticipation extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Date ebeanTimestamp;

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
	private Date started;
	
	@Temporal(TemporalType.TIMESTAMP)
	private Date ended;

	@Temporal(TemporalType.TIMESTAMP)
	private Date duration;

    // tentin arvioinnin takaraja
	@Temporal(TemporalType.TIMESTAMP)
	private Date deadline;

    public Date getDeadline() {
        return deadline;
    }

    public void setDeadline(Date deadline) {
        this.deadline = deadline;
    }

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

	public Date getStarted() {
		return started;
	}

	public void setStarted(Date started) {
		this.started = started;
	}

	public Date getEnded() {
		return ended;
	}

	public void setEnded(Date ended) {
		this.ended = ended;
	}

    public Date getDuration() {
        return duration;
    }

    public void setDuration(Date duration) {
        this.duration = duration;
    }
}
