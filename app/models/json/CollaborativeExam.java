// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.json;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.*;
import java.util.List;
import models.Exam;
import models.ExamEnrolment;
import models.ExamParticipation;
import models.base.GeneratedIdentityModel;
import org.joda.time.DateTime;
import util.datetime.DateTimeAdapter;
import util.json.JsonDeserializer;

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

    @Column(name = "exam_active_start_date")
    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime periodStart;

    @Column(name = "exam_active_end_date")
    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime periodEnd;

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

    public DateTime getPeriodStart() {
        return periodStart;
    }

    public void setPeriodStart(DateTime periodStart) {
        this.periodStart = periodStart;
    }

    public DateTime getPeriodEnd() {
        return periodEnd;
    }

    public void setPeriodEnd(DateTime periodEnd) {
        this.periodEnd = periodEnd;
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

    public Exam getExam(JsonNode node) {
        final ObjectNode objectNode = (ObjectNode) node;
        objectNode.put("id", id).put("externalRef", externalRef);
        return JsonDeserializer.deserialize(Exam.class, objectNode);
    }
}
