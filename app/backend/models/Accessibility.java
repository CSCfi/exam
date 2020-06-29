/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.models;

import backend.models.base.GeneratedIdentityModel;
import com.fasterxml.jackson.annotation.JsonBackReference;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToMany;

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
