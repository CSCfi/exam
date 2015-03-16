package models;

import play.db.ebean.Model;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
public class GradeScale extends Model {

    public enum Type {
        ZERO_TO_FIVE(1), LATIN(2), APPROVED_REJECTED(3);

        private int value;

        Type(int value) {
            this.value = value;
        }

        public int getValue() {
            return value;
        }

        public static Type get(int value) {
            for (Type t : values()) {
                if (t.getValue() == value) {
                    return t;
                }
            }
            return null;
        }
    }

    @Id
    @Column
    private int id;

    @Column
    private String description;

    @OneToMany(mappedBy = "gradeScale")
    private List<Grade> grades = new ArrayList<>();

    public Type getType() {
        return Type.get(id);
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<Grade> getGrades() {
        return grades;
    }

    public void setGrades(List<Grade> grades) {
        this.grades = grades;
    }

}
