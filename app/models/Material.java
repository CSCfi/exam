package models;

import javax.persistence.Entity;

@Entity
public class Material extends SitnetModel {


    private byte[] data;

    public Material(User creator) {
        super(creator);
    }

    public byte[] getData() {
        return data;
    }

    public void setData(byte[] data) {
        this.data = data;
    }


}
