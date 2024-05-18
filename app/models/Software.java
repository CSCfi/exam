// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToMany;
import java.util.List;
import java.util.Objects;
import models.base.GeneratedIdentityModel;

@Entity
public class Software extends GeneratedIdentityModel {

    @ManyToMany(cascade = CascadeType.ALL, mappedBy = "softwareInfo")
    @JsonBackReference
    private List<ExamMachine> machines;

    @ManyToMany(cascade = CascadeType.ALL, mappedBy = "softwares")
    @JsonBackReference
    private List<Exam> exams;

    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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
        if (!(o instanceof Software software)) return false;
        return Objects.equals(name, software.name);
    }

    @Override
    public int hashCode() {
        int result = super.hashCode();
        result = 31 * result + (name != null ? name.hashCode() : 0);
        return result;
    }
}
