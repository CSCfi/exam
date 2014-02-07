package models;

import javax.persistence.Entity;

@Entity
public class SNMaterial extends SNModel {

	
	private byte[] data;

	public SNMaterial(User creator, String mimeType) {
		super(creator, mimeType);
	}

	public byte[] getData() {
		return data;
	}

	public void setData(byte[] data) {
		this.data = data;
	}


	
	
}
