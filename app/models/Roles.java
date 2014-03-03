package models;

import be.objectify.deadbolt.core.models.Role;

/**
 * Created by avainik on 3/3/14.
 */
public enum Roles implements Role {

    ADMIN,
    STUDENT,
    TEACHER;

    @Override
    public String getName() {
        return name();
    }
}
