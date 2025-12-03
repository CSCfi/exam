// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam;

import io.ebean.Model;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class ExamExecutionType extends Model {

    public enum Type {
        PRIVATE,
        PUBLIC,
        MATURITY,
        PRINTOUT,
    }

    @Id
    private Integer id;

    private String type;
    private boolean active;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
