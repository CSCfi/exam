package models;

import models.base.GeneratedIdentityModel;

import javax.persistence.Entity;

@Entity
public class GeneralSettings extends GeneratedIdentityModel {

    private String name;

    private String value;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}
