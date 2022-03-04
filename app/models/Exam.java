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

package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import io.ebean.annotation.EnumValue;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import javax.annotation.Nonnull;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.JoinColumn;
import javax.persistence.JoinTable;
import javax.persistence.ManyToMany;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.Transient;
import models.api.AttachmentContainer;
import models.base.OwnedModel;
import models.questions.Question;
import models.sections.ExamSection;
import models.sections.ExamSectionQuestion;
import models.sections.ExamSectionQuestionOption;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import org.springframework.beans.BeanUtils;
import util.datetime.DateTimeAdapter;

@Entity
public class Exam extends OwnedModel implements Comparable<Exam>, AttachmentContainer {

    public enum State {
        @EnumValue("1")
        DRAFT,
        @EnumValue("2")
        SAVED,
        @EnumValue("3")
        PUBLISHED, // EXAM PUBLISHED, VISIBLE TO STUDENTS AND READY FOR TAKING
        @EnumValue("4")
        STUDENT_STARTED, // EXAM STARTED BY STUDENT
        @EnumValue("5")
        REVIEW, // EXAM RETURNED BY STUDENT AND READY FOR REVIEW
        @EnumValue("6")
        REVIEW_STARTED, // REVIEW STARTED BY TEACHERS
        @EnumValue("7")
        GRADED, // GRADE GIVEN
        @EnumValue("13")
        PRE_PUBLISHED, // COLLABORATIVE EXAM READY FOR TEACHERS FOR EDITING
        /* FINAL STATES */
        @EnumValue("8")
        GRADED_LOGGED, // EXAM PROCESSED AND READY FOR REGISTRATION
        @EnumValue("9")
        ARCHIVED, // EXAM ARCHIVED FOR CERTAIN PERIOD AFTER WHICH IT GETS DELETED
        @EnumValue("10")
        ABORTED, // EXAM ABORTED BY STUDENT WHILST TAKING
        @EnumValue("11")
        DELETED, // EXAM MARKED AS DELETED AND HIDDEN FROM END USERS
        @EnumValue("12")
        REJECTED, // EXAM NOT QUALIFIED FOR REGISTRATION
        @EnumValue("13")
        INITIALIZED, // EXAM PREPARED SO THAT IT IS READY FOR TAKING WHEN EXAMINATION STARTS
    }

    public enum Implementation {
        @EnumValue("1")
        AQUARIUM,
        @EnumValue("2")
        CLIENT_AUTH,
        @EnumValue("3")
        WHATEVER,
    }

    private static final DecimalFormat df = new DecimalFormat("#.##", new DecimalFormatSymbols(Locale.US));

    private boolean anonymous;

    private String name;

    @ManyToOne
    private Course course;

    @ManyToOne
    private ExamType examType;

    @ManyToMany
    @JoinTable(
        name = "exam_owner",
        joinColumns = @JoinColumn(name = "exam_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> examOwners;

    // Instruction written by teacher, shown during exam
    @Column(columnDefinition = "TEXT")
    private String instruction;

    // Instruction written by teacher, shown for reservation purposes
    @Column(columnDefinition = "TEXT")
    private String enrollInstruction;

    private boolean shared;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private Set<ExamSection> examSections;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private Set<ExaminationDate> examinationDates;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private Set<ExaminationEventConfiguration> examinationEventConfigurations;

    @ManyToOne(cascade = CascadeType.PERSIST)
    protected Exam parent;

    @OneToMany(mappedBy = "parent")
    @JsonBackReference
    private List<Exam> children;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private List<ExamEnrolment> examEnrolments;

    @OneToOne(mappedBy = "exam")
    @JsonManagedReference
    private ExamParticipation examParticipation;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private Set<ExamInspection> examInspections;

    @OneToOne(mappedBy = "exam")
    private ExamRecord examRecord;

    @OneToOne(mappedBy = "exam", cascade = CascadeType.ALL)
    private AutoEvaluationConfig autoEvaluationConfig;

    @OneToOne(mappedBy = "exam")
    private LanguageInspection languageInspection;

    @Column(length = 32, unique = true)
    private String hash;

    // Exam valid/enrollable from
    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime examActiveStartDate;

    // Exam valid/enrollable until
    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime examActiveEndDate;

    // Exam duration (minutes)
    private Integer duration;

    @ManyToOne
    private GradeScale gradeScale;

    // Custom course credit - if teachers changes course credit
    private Double customCredit;

    // Exam language
    @ManyToMany
    private List<Language> examLanguages;

    // Exam answer language
    private String answerLanguage;

    private State state;

    // Implementation
    private Implementation implementation;

    @ManyToOne
    private Grade grade;

    @ManyToMany(cascade = CascadeType.ALL)
    private List<Software> softwares;

    /*
     * this is the user who is marked as evaluator of the Exam
     * in WebOodi, or other system
     */
    @ManyToOne
    private User gradedByUser;

    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    private DateTime gradedTime;

    @OneToOne
    private Comment examFeedback;

    private String additionalInfo;

    // Number of times a student is allowed to take the exam before getting a grade
    private Integer trialCount;

    @ManyToOne
    private ExamType creditType;

    @ManyToOne
    private ExamExecutionType executionType;

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL)
    private Set<InspectionComment> inspectionComments;

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    private boolean expanded;

    @OneToOne(cascade = CascadeType.ALL)
    private Attachment attachment;

    @Temporal(TemporalType.TIMESTAMP)
    private DateTime autoEvaluationNotified;

    private boolean gradeless;

    private Boolean subjectToLanguageInspection;

    // Optional internal reference to this exam
    private String internalRef;

    private String assessmentInfo;

    public User getGradedByUser() {
        return gradedByUser;
    }

    public void setGradedByUser(User gradedByUser) {
        this.gradedByUser = gradedByUser;
    }

    public Set<User> getExamOwners() {
        return examOwners;
    }

    public void setExamOwners(Set<User> examOwners) {
        this.examOwners = examOwners;
    }

    public Set<ExaminationDate> getExaminationDates() {
        return examinationDates;
    }

    public void setExaminationDates(Set<ExaminationDate> examinationDates) {
        this.examinationDates = examinationDates;
    }

    public Set<ExaminationEventConfiguration> getExaminationEventConfigurations() {
        return examinationEventConfigurations;
    }

    public void setExaminationEventConfigurations(Set<ExaminationEventConfiguration> examinationEventConfigurations) {
        this.examinationEventConfigurations = examinationEventConfigurations;
    }

    // Aggregate properties, required as fields by Ebean
    @Transient
    private Double totalScore;

    @Transient
    private Double maxScore;

    @Transient
    private int rejectedAnswerCount;

    @Transient
    private int approvedAnswerCount;

    @Transient
    private boolean cloned;

    @Transient
    private boolean external;

    @Transient
    private String externalRef;

    private double toFixed(double val) {
        return Double.parseDouble(df.format(val));
    }

    public Double getTotalScore() {
        Double totalScore = toFixed(
            examSections.stream().map(ExamSection::getTotalScore).reduce(0.0, (sum, x) -> sum += x)
        );

        return Math.max(totalScore, 0.0);
    }

    public Double getMaxScore() {
        return toFixed(examSections.stream().map(ExamSection::getMaxScore).reduce(0.0, (sum, x) -> sum += x));
    }

    private int getApprovedAnswerCount() {
        return examSections.stream().map(ExamSection::getApprovedCount).reduce(0, (sum, x) -> sum += x);
    }

    private int getRejectedAnswerCount() {
        return examSections.stream().map(ExamSection::getRejectedCount).reduce(0, (sum, x) -> sum += x);
    }

    // These are dumb, required to be explicitly set by EBean
    public void setTotalScore() {
        totalScore = getTotalScore();
    }

    public void setMaxScore() {
        maxScore = getMaxScore();
    }

    public void setRejectedAnswerCount() {
        rejectedAnswerCount = getRejectedAnswerCount();
    }

    public void setApprovedAnswerCount() {
        approvedAnswerCount = getApprovedAnswerCount();
    }

    public boolean isCloned() {
        return cloned;
    }

    public void setCloned(boolean cloned) {
        this.cloned = cloned;
    }

    public boolean isExternal() {
        return external;
    }

    public void setExternal(boolean external) {
        this.external = external;
    }

    public String getExternalRef() {
        return externalRef;
    }

    public void setExternalRef(String externalRef) {
        this.externalRef = externalRef;
    }

    public DateTime getGradedTime() {
        return gradedTime;
    }

    public void setGradedTime(DateTime gradedTime) {
        this.gradedTime = gradedTime;
    }

    public boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(boolean expanded) {
        this.expanded = expanded;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ExamType getExamType() {
        return examType;
    }

    public void setExamType(ExamType examType) {
        this.examType = examType;
    }

    public Set<ExamSection> getExamSections() {
        return examSections;
    }

    public void setExamSections(Set<ExamSection> examSections) {
        this.examSections = examSections;
    }

    public String getInstruction() {
        return instruction;
    }

    public void setInstruction(String instruction) {
        this.instruction = instruction;
    }

    public boolean isShared() {
        return shared;
    }

    public void setShared(boolean shared) {
        this.shared = shared;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public Integer getDuration() {
        return duration;
    }

    public void setDuration(Integer duration) {
        this.duration = duration;
    }

    public GradeScale getGradeScale() {
        return gradeScale;
    }

    public void setGradeScale(GradeScale gradeScale) {
        this.gradeScale = gradeScale;
    }

    public Double getCustomCredit() {
        return customCredit;
    }

    public void setCustomCredit(Double customCredit) {
        this.customCredit = customCredit;
    }

    public List<Language> getExamLanguages() {
        return examLanguages;
    }

    public void setExamLanguages(List<Language> examLanguages) {
        this.examLanguages = examLanguages;
    }

    public String getAnswerLanguage() {
        return answerLanguage;
    }

    public void setAnswerLanguage(String answerLanguage) {
        this.answerLanguage = answerLanguage;
    }

    public void generateHash() {
        String attributes = name + state + new Random().nextDouble();
        this.hash = DigestUtils.md5Hex(attributes);
    }

    public String getEnrollInstruction() {
        return enrollInstruction;
    }

    public void setEnrollInstruction(String enrollInstruction) {
        this.enrollInstruction = enrollInstruction;
    }

    public Exam getParent() {
        return parent;
    }

    public void setParent(Exam parent) {
        this.parent = parent;
    }

    public Grade getGrade() {
        return grade;
    }

    public void setGrade(Grade grade) {
        this.grade = grade;
    }

    public State getState() {
        return state;
    }

    public void setState(State state) {
        this.state = state;
    }

    public Integer getTrialCount() {
        return trialCount;
    }

    public void setTrialCount(Integer trialCount) {
        this.trialCount = trialCount;
    }

    public Comment getExamFeedback() {
        return examFeedback;
    }

    public void setExamFeedback(Comment examFeedback) {
        this.examFeedback = examFeedback;
    }

    public String getAdditionalInfo() {
        return additionalInfo;
    }

    public void setAdditionalInfo(String additionalInfo) {
        this.additionalInfo = additionalInfo;
    }

    public ExamType getCreditType() {
        return creditType;
    }

    public void setCreditType(ExamType creditType) {
        this.creditType = creditType;
    }

    public List<Software> getSoftwareInfo() {
        return softwares;
    }

    public void setSoftwareInfo(List<Software> softwareInfo) {
        softwares = softwareInfo;
    }

    public List<ExamEnrolment> getExamEnrolments() {
        return examEnrolments;
    }

    public void setExamEnrolments(List<ExamEnrolment> examEnrolments) {
        this.examEnrolments = examEnrolments;
    }

    public ExamParticipation getExamParticipation() {
        return examParticipation;
    }

    public void setExamParticipation(ExamParticipation examParticipation) {
        this.examParticipation = examParticipation;
    }

    public List<Exam> getChildren() {
        return children;
    }

    public void setChildren(List<Exam> children) {
        this.children = children;
    }

    public Set<ExamInspection> getExamInspections() {
        return examInspections;
    }

    public void setExamInspections(Set<ExamInspection> examInspections) {
        this.examInspections = examInspections;
    }

    public LanguageInspection getLanguageInspection() {
        return languageInspection;
    }

    public ExamRecord getExamRecord() {
        return examRecord;
    }

    public void setLanguageInspection(LanguageInspection languageInspection) {
        this.languageInspection = languageInspection;
    }

    public String getAssessmentInfo() {
        return assessmentInfo;
    }

    public void setAssessmentInfo(String assessmentInfo) {
        this.assessmentInfo = assessmentInfo;
    }

    private Exam createCopy(User user, boolean produceStudentExam, boolean setParent, Set<Long> selectedSections) {
        Exam clone = new Exam();
        BeanUtils.copyProperties(
            this,
            clone,
            "id",
            "examSections",
            "examEnrolments",
            "examParticipation",
            "examinationEventConfigurations",
            "examInspections",
            "autoEvaluationConfig",
            "creator",
            "created",
            produceStudentExam ? "examOwners" : "none"
        );
        if (setParent) {
            clone.setParent(this);
        }
        clone.setCreatorWithDate(user);
        clone.setModifierWithDate(user);
        clone.generateHash();
        clone.save();

        if (autoEvaluationConfig != null) {
            AutoEvaluationConfig configClone = autoEvaluationConfig.copy();
            configClone.setExam(clone);
            configClone.save();
            clone.setAutoEvaluationConfig(configClone);
        }

        for (ExamInspection ei : examInspections) {
            ExamInspection inspection = new ExamInspection();
            BeanUtils.copyProperties(ei, inspection, "id", "exam");
            inspection.setExam(clone);
            inspection.save();
        }
        Set<ExamSection> sections = new TreeSet<>();
        if (produceStudentExam) {
            sections.addAll(
                examSections
                    .stream()
                    .filter(es -> !es.isOptional() || selectedSections.contains(es.getId()))
                    .collect(Collectors.toSet())
            );
        } else {
            sections.addAll(examSections);
        }
        for (ExamSection es : sections) {
            ExamSection esCopy = es.copy(clone, produceStudentExam, setParent, user);
            esCopy.setCreatorWithDate(user);
            esCopy.setModifierWithDate(user);
            // Shuffle question options before saving
            for (ExamSectionQuestion esq : esCopy.getSectionQuestions()) {
                Optional<Question.Type> type = Optional.ofNullable(esq.getQuestion()).map(Question::getType);
                if (type.isPresent() && type.get() == Question.Type.ClaimChoiceQuestion) {
                    continue;
                }
                List<ExamSectionQuestionOption> shuffled = new ArrayList<>(esq.getOptions());
                Collections.shuffle(shuffled);
                esq.setOptions(new HashSet<>(shuffled));
            }
            esCopy.save();
            for (ExamSectionQuestion esq : esCopy.getSectionQuestions()) {
                if (produceStudentExam) {
                    Question questionCopy = esq.getQuestion();
                    questionCopy.setCreatorWithDate(user);
                    questionCopy.setModifierWithDate(user);
                    questionCopy.update();
                }
                esq.save();
            }
            clone.getExamSections().add(esCopy);
        }
        if (attachment != null) {
            Attachment copy = new Attachment();
            BeanUtils.copyProperties(attachment, copy, "id");
            clone.setAttachment(copy);
        }
        return clone;
    }

    public Exam copyForStudent(User student, boolean isCollaborative, Set<Long> selectedSections) {
        return createCopy(student, true, !isCollaborative, selectedSections);
    }

    public Exam copy(User user) {
        return createCopy(user, false, true, Collections.emptySet());
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

    public void setAttachment(Attachment attachment) {
        this.attachment = attachment;
    }

    public Attachment getAttachment() {
        return attachment;
    }

    public ExamExecutionType getExecutionType() {
        return executionType;
    }

    public void setExecutionType(ExamExecutionType executionType) {
        this.executionType = executionType;
    }

    public AutoEvaluationConfig getAutoEvaluationConfig() {
        return autoEvaluationConfig;
    }

    public void setAutoEvaluationConfig(AutoEvaluationConfig autoEvaluationConfig) {
        this.autoEvaluationConfig = autoEvaluationConfig;
    }

    public Set<InspectionComment> getInspectionComments() {
        return inspectionComments;
    }

    public void setInspectionComments(Set<InspectionComment> inspectionComments) {
        this.inspectionComments = inspectionComments;
    }

    public DateTime getAutoEvaluationNotified() {
        return autoEvaluationNotified;
    }

    public void setAutoEvaluationNotified(DateTime autoEvaluationNotified) {
        this.autoEvaluationNotified = autoEvaluationNotified;
    }

    public boolean isGradeless() {
        return gradeless;
    }

    public void setGradeless(boolean gradeless) {
        this.gradeless = gradeless;
    }

    public Boolean getSubjectToLanguageInspection() {
        return subjectToLanguageInspection;
    }

    public void setSubjectToLanguageInspection(Boolean subjectToLanguageInspection) {
        this.subjectToLanguageInspection = subjectToLanguageInspection;
    }

    public String getInternalRef() {
        return internalRef;
    }

    public void setInternalRef(String internalRef) {
        this.internalRef = internalRef;
    }

    public boolean isAnonymous() {
        return anonymous;
    }

    public void setAnonymous(boolean anonymous) {
        this.anonymous = anonymous;
    }

    public Implementation getImplementation() {
        return implementation;
    }

    public void setImplementation(Implementation implementation) {
        this.implementation = implementation;
    }

    @Transient
    private boolean isCreatedBy(User user) {
        return creator != null && creator.equals(user);
    }

    @Transient
    private boolean isInspectedBy(User user, boolean applyToChildOnly) {
        Exam examToCheck = parent == null || applyToChildOnly ? this : parent;
        return examToCheck.examInspections.stream().anyMatch(ei -> ei.getUser().equals(user));
    }

    @Transient
    private boolean isOwnedBy(User user) {
        Exam examToCheck = parent == null ? this : parent;
        return examToCheck.examOwners.stream().anyMatch(owner -> owner.equals(user));
    }

    @Transient
    public boolean isOwnedOrCreatedBy(User user) {
        return isCreatedBy(user) || isOwnedBy(user);
    }

    @Transient
    public boolean isInspectedOrCreatedOrOwnedBy(User user) {
        return isInspectedBy(user, false) || isOwnedBy(user) || isCreatedBy(user);
    }

    @Transient
    public boolean isChildInspectedOrCreatedOrOwnedBy(User user) {
        return isInspectedBy(user, true) || isOwnedBy(user) || isCreatedBy(user);
    }

    @Transient
    public boolean isViewableForLanguageInspector(User user) {
        return (
            executionType.getType().equals(ExamExecutionType.Type.MATURITY.toString()) &&
            user.hasPermission(Permission.Type.CAN_INSPECT_LANGUAGE) &&
            languageInspection != null &&
            languageInspection.getAssignee() != null
        );
    }

    @Transient
    public boolean isPrivate() {
        return (
            !executionType.getType().equals(ExamExecutionType.Type.PUBLIC.toString()) &&
            !isPrintout() &&
            (implementation == null || implementation.toString().equals(Implementation.AQUARIUM.toString()))
        );
    }

    @Transient
    public boolean isPrintout() {
        return executionType.getType().equals(ExamExecutionType.Type.PRINTOUT.toString());
    }

    @Transient
    public boolean hasState(State... states) {
        return Arrays.asList(states).contains(state);
    }

    @Transient
    public void setDerivedMaxScores() {
        examSections
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .forEach(esq -> {
                esq.setDerivedMaxScore();
                // Also set min scores, if question is claim choice question
                Optional<Question.Type> type = Optional.ofNullable(esq.getQuestion()).map(Question::getType);
                if (type.isPresent() && type.get() == Question.Type.ClaimChoiceQuestion) {
                    esq.setDerivedMinScore();
                }
                esq.getOptions().forEach(o -> o.setScore(null));
            });
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof Exam)) {
            return false;
        }
        Exam otherExam = (Exam) other;
        return new EqualsBuilder().append(id, otherExam.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }

    @Override
    public String toString() {
        return (
            "Exam{" +
            "course=" +
            course +
            ", id='" +
            id +
            '\'' +
            ", name='" +
            name +
            '\'' +
            ", examType=" +
            examType +
            ", hash='" +
            hash +
            '\'' +
            ", state='" +
            state +
            '\'' +
            '}'
        );
    }

    @Override
    public int compareTo(@Nonnull Exam other) {
        return created.compareTo(other.created);
    }
}
