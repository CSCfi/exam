// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.user;

import jakarta.persistence.Entity;
import java.util.Objects;
import models.base.GeneratedIdentityModel;

@Entity
public class Role extends GeneratedIdentityModel implements be.objectify.deadbolt.java.models.Role {

    public enum Name {
        STUDENT,
        TEACHER,
        ADMIN,
        SUPPORT,
    }

    private String name;

    @Override
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public static Role withName(String name) {
        Role role = new Role();
        role.setName(name);
        return role;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Role role)) return false;
        return Objects.equals(name, role.name);
    }

    @Override
    public int hashCode() {
        return name != null ? name.hashCode() : 0;
    }
}
