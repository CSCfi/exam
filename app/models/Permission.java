package models;


import javax.persistence.Entity;

@Entity
public class Permission extends GeneratedIdentityModel implements be.objectify.deadbolt.core.models.Permission {

    private String value;

    @Override
    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Permission)) return false;
        Permission permission = (Permission) o;
        return !(value != null ? !value.equals(permission.value) : permission.value != null);
    }

    @Override
    public int hashCode() {
        return value != null ? value.hashCode() : 0;
    }

}
