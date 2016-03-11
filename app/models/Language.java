package models;

import models.base.VersionedModel;

import javax.persistence.Entity;
import javax.persistence.Id;

@Entity
public class Language extends VersionedModel {

    @Id
    private String code;

    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

}
