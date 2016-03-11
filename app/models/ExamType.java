package models;


import models.base.GeneratedIdentityModel;

import javax.persistence.Column;
import javax.persistence.Entity;

@Entity
public class ExamType extends GeneratedIdentityModel {

    private String type;

    @Column(columnDefinition = "boolean default false")
    private Boolean deprecated;

    public ExamType(String type) {
        this.type = type;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setDeprecated(boolean deprecated) {
        this.deprecated = deprecated;
    }

    public Boolean isDeprecated() {
        return deprecated;
    }
}
