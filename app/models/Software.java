package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.base.GeneratedIdentityModel;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToMany;
import java.util.List;

@Entity
public class Software extends GeneratedIdentityModel {

    @ManyToMany(cascade = CascadeType.ALL, mappedBy = "softwareInfo")
    @JsonBackReference
    private List<ExamMachine> machines;

    @ManyToMany(cascade = CascadeType.ALL)
    @JsonBackReference
    private List<Exam> exams;

    private String name;

    private String status;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<Exam> getExams() {
        return exams;
    }

    public void setExams(List<Exam> exams) {
        this.exams = exams;
    }

    public List<ExamMachine> getMachines() {
        return machines;
    }

    public void setMachines(List<ExamMachine> machines) {
        this.machines = machines;
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
