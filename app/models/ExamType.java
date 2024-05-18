// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models;

import jakarta.persistence.Entity;
import models.base.GeneratedIdentityModel;

@Entity
public class ExamType extends GeneratedIdentityModel {

    private String type;

    private boolean deprecated;

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

    public boolean isDeprecated() {
        return deprecated;
    }
}
