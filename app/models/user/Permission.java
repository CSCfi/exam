// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.ebean.annotation.EnumValue;
import jakarta.persistence.Entity;
import java.util.Objects;
import models.base.GeneratedIdentityModel;

@Entity
public class Permission extends GeneratedIdentityModel {

    public enum Type {
        @EnumValue("1")
        CAN_INSPECT_LANGUAGE,
        @EnumValue("2")
        CAN_CREATE_BYOD_EXAM,
    }

    private Type type;

    @JsonIgnore
    public String getValue() {
        return type.toString();
    }

    public Type getType() {
        return type;
    }

    public void setType(Type type) {
        this.type = type;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Permission permission)) return false;
        return Objects.equals(type, permission.type);
    }

    @Override
    public int hashCode() {
        return type != null ? type.hashCode() : 0;
    }
}
