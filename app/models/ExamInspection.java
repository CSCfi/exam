package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.base.GeneratedIdentityModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;

@Entity
public class ExamInspection extends GeneratedIdentityModel {

	@ManyToOne
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

	public User getUser() {
		return user;
	}

    public User getAssignedBy() { return assignedBy; }

	public void setExam(Exam exam) {
		this.exam = exam;
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

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ExamInspection)) {
            return false;
        }
        ExamInspection otherInspection = (ExamInspection) other;
        return new EqualsBuilder().append(id, otherInspection.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }

}
