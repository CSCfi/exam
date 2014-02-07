package models;

import javax.persistence.Entity;
import javax.persistence.OneToOne;

@Entity
public class SNComment extends SNModel {

	private static final long serialVersionUID = -2181535922286837961L;

	private String comment;

	@OneToOne
	private SNComment reply;


	public SNComment(User creator, String mimeType, String comment) {
		super(creator, mimeType);
		this.comment = comment;
	}


	public String getComment() {
		return comment;
	}


	public void setComment(String comment) {
		this.comment = comment;
	}


	public SNComment getReply() {
		return reply;
	}


	public void setReply(SNComment reply) {
		this.reply = reply;
	}

	
}
