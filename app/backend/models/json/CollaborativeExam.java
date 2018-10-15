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

package backend.models.json;

import java.util.List;
import javax.persistence.*;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.joda.time.DateTime;

import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamParticipation;
import backend.models.base.GeneratedIdentityModel;
import backend.util.datetime.DateTimeAdapter;
import backend.util.json.JsonDeserializer;

@Entity
public class CollaborativeExam extends GeneratedIdentityModel {

    @Column
    private String externalRef; // REFERENCE TO EXAM ELSEWHERE

    @Column
    private String revision; // REFERENCE TO EXAM REVISION ELSEWHERE

    @Column
    private String name;

    @Column(length = 32, unique = true)
    private String hash;

    @Column
    private Exam.State state;

    @Column
    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime examActiveStartDate;

    @Column
    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime examActiveEndDate;

    @Column
    private Integer duration;

    @Column(columnDefinition = "TEXT")
    private String enrollInstruction;

    @Temporal(TemporalType.TIMESTAMP)
    private DateTime created;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "collaborativeExam")
    @JsonManagedReference
    private List<ExamEnrolment> examEnrolments;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "collaborativeExam")
    @JsonManagedReference
    private List<ExamParticipation> examParticipations;

    @Column
    private boolean anonymous;

    public String getExternalRef() {
        return externalRef;
    }

    public void setExternalRef(String externalRef) {
        this.externalRef = externalRef;
    }

    public String getRevision() {
        return revision;
    }

    public void setRevision(String revision) {
        this.revision = revision;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public DateTime getExamActiveStartDate() {
        return examActiveStartDate;
    }

    public void setExamActiveStartDate(DateTime examActiveStartDate) {
        this.examActiveStartDate = examActiveStartDate;
    }

    public DateTime getExamActiveEndDate() {
        return examActiveEndDate;
    }

    public void setExamActiveEndDate(DateTime examActiveEndDate) {
        this.examActiveEndDate = examActiveEndDate;
    }

    public Integer getDuration() {
        return duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public String getEnrollInstruction() {
        return enrollInstruction;
    }

    public void setEnrollInstruction(String enrollInstruction) {
        this.enrollInstruction = enrollInstruction;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public Exam.State getState() {
        return state;
    }

    public void setState(Exam.State state) {
        this.state = state;
    }

    public DateTime getCreated() {
        return created;
    }

    public void setCreated(DateTime created) {
        this.created = created;
    }

    public List<ExamEnrolment> getExamEnrolments() {
        return examEnrolments;
    }

    public void setExamEnrolments(List<ExamEnrolment> examEnrolments) {
        this.examEnrolments = examEnrolments;
    }

    public List<ExamParticipation> getExamParticipations() {
        return examParticipations;
    }

    public void setExamParticipations(List<ExamParticipation> examParticipations) {
        this.examParticipations = examParticipations;
    }

    public boolean isAnonymous() {
        return anonymous;
    }

    public void setAnonymous(boolean anonymous) {
        this.anonymous = anonymous;
    }

    @Transient
    public Exam getExam(JsonNode node) {
        final ObjectNode objectNode = (ObjectNode) node;
        objectNode.put("id", id).put("externalRef", externalRef);
        return JsonDeserializer.deserialize(Exam.class, objectNode);
    }

}
