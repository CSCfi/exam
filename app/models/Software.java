package models;

import play.db.ebean.Model;

import javax.persistence.*;
import java.util.List;

/**
 * Created by mikkokatajamaki on 05/05/14.
 */
@Entity
public class Software extends Model {

    @Version
    protected Long ebeanTimestamp;

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
}
