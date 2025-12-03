// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.user;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import models.base.VersionedModel;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;

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
        if (!(o instanceof Language language)) return false;
        return new EqualsBuilder().append(code, language.code).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder(17, 37).append(code).build();
    }
}
