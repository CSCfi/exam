package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
public class ExamInspection extends Model {

	@Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
    
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
