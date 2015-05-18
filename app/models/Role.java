package models;


import play.db.ebean.Model;

import javax.persistence.*;
import java.util.Date;

@Entity
public class Role extends Model implements be.objectify.deadbolt.core.models.Role {

    public static final Finder<Long, Role> find = new Finder<>(Long.class, Role.class);

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Date ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String name;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }


    @Override
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

}
