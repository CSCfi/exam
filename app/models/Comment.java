package models;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.OneToOne;

@Entity
public class Comment extends SitnetModel {

//	@ManyToOne(cascade = CascadeType.PERSIST)
//	private AbstractQuestion question;

    @Column(columnDefinition = "TEXT")
	private String comment;

	@OneToOne
	private Comment reply;


	public String getComment() {
		return comment;
	}

	public void setComment(String comment) {
		this.comment = comment;
	}

	public Comment getReply() {
		return reply;
	}

	public void setReply(Comment reply) {
		this.reply = reply;
	}

}
