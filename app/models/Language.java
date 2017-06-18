package models;

import models.base.VersionedModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Language)) return false;
        Language language = (Language) o;
        return new EqualsBuilder()
                .append(code, language.code)
                .build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder(17, 37)
                .append(code).build();
    }
}
