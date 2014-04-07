package models;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import play.db.ebean.Model;

import javax.persistence.*;
import java.util.List;

/*
 * Huoneisto ja tila
 * http://tietomalli.csc.fi/Huoneisto%20ja%20tila-kaavio.html
 * 
 * Tenttiakvaario
 * 
 */
@Entity
public class ExamRoom extends Model {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long id;

	private String name;


    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "room")
    @JsonManagedReference
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
}
