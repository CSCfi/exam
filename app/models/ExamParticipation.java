package models;

import com.fasterxml.jackson.annotation.JsonBackReference;

import javax.persistence.*;
import java.util.Date;

@Entity
public class ExamParticipation extends GeneratedIdentityModel {

    @ManyToOne
	@JsonBackReference
	private User user;

    @ManyToOne
    @JsonBackReference
	private Exam exam;

	@Temporal(TemporalType.TIMESTAMP)
	private Date started;
	
	@Temporal(TemporalType.TIMESTAMP)
	private Date ended;

	@Temporal(TemporalType.TIMESTAMP)
	private Date duration;

    @Temporal(TemporalType.TIMESTAMP)
	private Date deadline;

    public Date getDeadline() {
        return deadline;
    }

    public void setDeadline(Date deadline) {
        this.deadline = deadline;
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
