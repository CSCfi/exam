package models;

import javax.persistence.Entity;

/**
 * Created by Mikko Katajamaki on 20/08/14.
 */
@Entity
public class Grade extends SitnetModel{

    public String scale;
    public String grade;
    public String description;

    public String getScale() {
        return scale;
    }

    public void setScale(String scale) {
        this.scale = scale;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    @Override
    public String toString() {
        return "Grade{" +
                "id=" + id +
                ", scale='" + scale + '\'' +
                ", grade=" + grade +
                ", description=" + description +
                '}';
    }
}
