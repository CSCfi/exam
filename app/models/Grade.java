package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.avaje.ebean.Model;

import javax.persistence.*;

@Entity
public class Grade extends Model {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Integer id;

    @Column
    private String name;

    @ManyToOne
    @JsonBackReference
    private GradeScale gradeScale;

    public Integer getId() {
        return id;
    }

    public void setId() {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public GradeScale getGradeScale() {
        return gradeScale;
    }

    public void setGradeScale(GradeScale gradeScale) {
        this.gradeScale = gradeScale;
    }

}
