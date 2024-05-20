// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import java.util.List;
import models.base.GeneratedIdentityModel;

@Entity
public class Organisation extends GeneratedIdentityModel {

    private String code;

    private String name;

    private String nameAbbreviation;

    @OneToMany(mappedBy = "parent")
    @JsonBackReference
    private List<Organisation> children;

    @ManyToOne(cascade = CascadeType.PERSIST)
    private Organisation parent;

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getNameAbbreviation() {
        return nameAbbreviation;
    }

    public void setNameAbbreviation(String nameAbbreviation) {
        this.nameAbbreviation = nameAbbreviation;
    }

    public List<Organisation> getChildren() {
        return children;
    }

    public void setChildren(List<Organisation> children) {
        this.children = children;
    }

    public Organisation getParent() {
        return parent;
    }

    public void setParent(Organisation parent) {
        this.parent = parent;
    }
}
