package models;

import javax.persistence.Entity;
import javax.persistence.OneToOne;

@Entity
public class Comment extends SitnetModel {

	private static final long serialVersionUID = -2181535922286837961L;

	private String comment;

	@OneToOne
	private Comment reply;


	public Comment(User creator, String comment) {
		super(creator);
		this.comment = comment;
	}


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
