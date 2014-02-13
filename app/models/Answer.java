package models;

import javax.persistence.Entity;

@Entity
public class Answer extends SitnetModel {

	private byte[] data;
	
	
	public Answer(User creator) {
		super(creator);
	}


	public byte[] getData() {
		return data;
	}


	public void setData(byte[] data) {
		this.data = data;
	}

	
	
}
