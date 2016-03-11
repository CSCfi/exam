package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.base.GeneratedIdentityModel;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToMany;
import java.util.List;

@Entity
public class Accessibility extends GeneratedIdentityModel {

    private String name;

    @ManyToMany(cascade = CascadeType.ALL)
    @JsonBackReference
    private List<ExamRoom> examRoom;

    @ManyToMany(cascade = CascadeType.ALL)
    @JsonBackReference
    private List<ExamMachine> examMachine;

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
