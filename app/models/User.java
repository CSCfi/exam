package models;

public class User {

    //todo: check play framework's way to do this!
    public static enum Role {
        ADMIN,
        STUDENT,
        TEACHER
    }

    //todo: check proper fields for User
    private String username;
    private String oid;
    private String firstName;
    private String lastName;
    private String email;
    private Enum Role;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Enum getRole() {
        return Role;
    }

    public void setRole(Enum role) {
        Role = role;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getOid() {
        return oid;
    }

    public void setOid(String oid) {
        this.oid = oid;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
}
