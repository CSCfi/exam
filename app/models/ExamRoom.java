package models;

import java.util.List;

import javax.persistence.Entity;

/*
 * Huoneisto ja tila
 * http://tietomalli.csc.fi/Huoneisto%20ja%20tila-kaavio.html
 * 
 * Tenttiakvaario
 * 
 */
@Entity
public class ExamRoom {

	private String name;

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
}
