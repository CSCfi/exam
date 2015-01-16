package models;

import play.db.ebean.Model;

import javax.persistence.*;
import java.util.Date;
import java.util.List;

/**
 * Created by mikkokatajamaki on 05/05/14.
 */
@Entity
public class Software extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Date ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToMany(cascade = CascadeType.ALL, mappedBy = "softwareInfo")
    private List<ExamMachine> machine;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<Exam> exams;

    private String name;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        Software software = (Software) o;

        return !(name != null ? !name.equals(software.name) : software.name != null);

    }

    @Override
    public int hashCode() {
        int result = super.hashCode();
        result = 31 * result + (name != null ? name.hashCode() : 0);
        return result;
    }
}
