package models;


import play.db.ebean.Model;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
public class ExamType extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy= GenerationType.AUTO)
    private Long id;

    private String type;

    @Column(columnDefinition = "boolean default false")
    private Boolean deprecated;

    public ExamType(String type) {
        this.type = type;
    }

    public Long getId() {
        return id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setDeprecated(boolean deprecated) {
        this.deprecated = deprecated;
    }

    public Boolean isDeprecated() {
        return deprecated;
    }
}
