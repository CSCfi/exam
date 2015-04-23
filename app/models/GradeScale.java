package models;

import play.db.ebean.Model;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
public class GradeScale extends Model {

    public enum Type {
        ZERO_TO_FIVE(1), LATIN(2), APPROVED_REJECTED(3), OTHER(4);

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

        public static Type get(String value) {
            for (Type t : values()) {
                if (t.toString().equals(value)) {
                    return t;
                }
            }
            return null;
        }
    }

    @Id
    @GeneratedValue(strategy=GenerationType.AUTO)
    @Column
    private int id;

    @Column
    private String description;

    @Column
    private Long externalRef;

    @Column
    private String displayName;

    @OneToMany(mappedBy = "gradeScale", cascade = CascadeType.ALL)
    private List<Grade> grades = new ArrayList<>();

    public int getId() {
        return id;
    }

    public Type getType() {
        return Type.get(description);
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Long getExternalRef() {
        return externalRef;
    }

    public void setExternalRef(Long externalRef) {
        this.externalRef = externalRef;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public List<Grade> getGrades() {
        return grades;
    }

    public void setGrades(List<Grade> grades) {
        this.grades = grades;
    }

}
