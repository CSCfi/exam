// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToMany;
import java.util.List;
import models.base.GeneratedIdentityModel;

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
