/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.ebean.annotation.EnumValue;
import jakarta.persistence.Entity;
import java.util.Objects;
import java.util.Optional;
import models.base.GeneratedIdentityModel;

@Entity
public class Permission extends GeneratedIdentityModel implements be.objectify.deadbolt.java.models.Permission {

    public enum Type {
        @EnumValue("1")
        CAN_INSPECT_LANGUAGE,
        @EnumValue("2")
        CAN_CREATE_BYOD_EXAM,
    }

    private Type type;

    @Override
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

    public static Optional<Permission> withValue(String name) {
        if (name.equals(Type.CAN_INSPECT_LANGUAGE.name())) { // dumb but then again we have just one valid permission
            Permission permission = new Permission();
            permission.setType(Type.CAN_INSPECT_LANGUAGE);
            return Optional.of(permission);
        }
        return Optional.empty();
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
