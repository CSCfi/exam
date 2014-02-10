package models;

import javax.persistence.Entity;

@Entity
public class Answer extends SitnetModel {

	private byte[] data;
	
	
	public Answer(User creator, String mimeType) {
		super(creator, mimeType);
	}


	public byte[] getData() {
		return data;
	}


	public void setData(byte[] data) {
		this.data = data;
	}

	
	
}
