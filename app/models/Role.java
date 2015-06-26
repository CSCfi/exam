package models;


import javax.persistence.Entity;

@Entity
public class Role extends GeneratedIdentityModel implements be.objectify.deadbolt.core.models.Role {

    public static final Finder<Long, Role> find = new Finder<>(Long.class, Role.class);

    private String name;

    @Override
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

}
