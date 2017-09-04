package models;


import io.ebean.annotation.EnumValue;
import models.base.GeneratedIdentityModel;

import javax.persistence.Entity;
import javax.persistence.Transient;

@Entity
public class Permission extends GeneratedIdentityModel implements be.objectify.deadbolt.java.models.Permission {

    public enum Type {
        @EnumValue("1")
        CAN_INSPECT_LANGUAGE
    }

    private Type type;

    @Override
    @Transient
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
        if (!(o instanceof Permission)) return false;
        Permission permission = (Permission) o;
        return !(type != null ? !type.equals(permission.type) : permission.type != null);
    }

    @Override
    public int hashCode() {
        return type != null ? type.hashCode() : 0;
    }

}
