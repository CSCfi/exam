package models;

import models.questions.AbstractQuestion;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;

@Entity
public class Comment extends SitnetModel {

	private static final long serialVersionUID = -2181535922286837961L;

	@ManyToOne(cascade = CascadeType.PERSIST)
	private AbstractQuestion question;
	
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
