package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import play.db.ebean.Model;

import javax.persistence.*;
import java.util.Date;
import java.util.List;

@Entity
public class Accessibility extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Date ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    private String name;

    @ManyToMany(cascade = CascadeType.ALL)
    @JsonBackReference
    private List<ExamRoom> examRoom;

    @ManyToMany(cascade = CascadeType.ALL)
    @JsonBackReference
    private List<ExamMachine> examMachine;

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

    public List<ExamMachine> getExamMachine() {
        return examMachine;
    }

    public void setExamMachine(List<ExamMachine> examMachine) {
        this.examMachine = examMachine;
    }

    public List<ExamRoom> getExamRoom() {
        return examRoom;
    }

    public void setExamRoom(List<ExamRoom> examRoom) {
        this.examRoom = examRoom;
    }
}
