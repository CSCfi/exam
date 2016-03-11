package models;


import com.avaje.ebean.annotation.EnumMapping;
import models.base.GeneratedIdentityModel;

import javax.persistence.Entity;
import javax.persistence.Transient;

@Entity
public class Permission extends GeneratedIdentityModel implements be.objectify.deadbolt.java.models.Permission {

    @EnumMapping(integerType = true, nameValuePairs = "CAN_INSPECT_LANGUAGE=1")
    public enum Type {
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
