package models;

import models.questions.AbstractQuestion;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;

@Entity
public class Material extends SitnetModel {

	@ManyToOne(cascade = CascadeType.PERSIST)
	private AbstractQuestion question;

    private byte[] data;


    public byte[] getData() {
        return data;
    }

    public void setData(byte[] data) {
        this.data = data;
    }


}
