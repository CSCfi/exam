// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import controllers.exam.copy.ExamCopyContext;
import io.ebean.annotation.EnumValue;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Temporal;
import jakarta.persistence.TemporalType;
import jakarta.persistence.Transient;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Nonnull;
import miscellaneous.datetime.DateTimeAdapter;
import models.assessment.AutoEvaluationConfig;
import models.assessment.Comment;
import models.assessment.ExamFeedbackConfig;
import models.assessment.ExamInspection;
import models.assessment.ExamRecord;
import models.assessment.InspectionComment;
import models.assessment.LanguageInspection;
import models.attachment.Attachment;
import models.attachment.AttachmentContainer;
import models.base.OwnedModel;
import models.enrolment.ExamEnrolment;
import models.enrolment.ExamParticipation;
import models.enrolment.ExaminationEventConfiguration;
import models.facility.Software;
import models.questions.Question;
import models.sections.ExamSection;
import models.sections.ExamSectionQuestion;
import models.sections.ExamSectionQuestionOption;
import models.user.Language;
import models.user.Permission;
import models.user.User;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.joda.time.DateTime;
import org.springframework.beans.BeanUtils;

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
        @EnumValue("14")
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

    // Instruction written by the teacher, shown during exam
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

    @OneToOne(mappedBy = "exam", cascade = CascadeType.ALL)
    private ExamFeedbackConfig examFeedbackConfig;

    @OneToOne(mappedBy = "exam")
    private LanguageInspection languageInspection;

    @Column(length = 32, unique = true)
    private String hash;

    // Exam valid/ready for enrolling from
    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    @Column(name = "exam_active_start_date")
    private DateTime periodStart;

    // Exam valid/ready for enrolling until
    @Temporal(TemporalType.TIMESTAMP)
    @JsonSerialize(using = DateTimeAdapter.class)
    @Column(name = "exam_active_end_date")
    private DateTime periodEnd;

    // Exam duration (minutes)
    private Integer duration;

    @ManyToOne
    private GradeScale gradeScale;

    // Custom course credit
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

    @OneToOne(cascade = CascadeType.ALL)
    private Attachment attachment;

    @Temporal(TemporalType.TIMESTAMP)
    private DateTime autoEvaluationNotified;

    private Grade.Type gradingType;

    private Boolean subjectToLanguageInspection;

    // Optional internal reference to this exam
    private String internalRef;

    private String assessmentInfo;

    private String organisations;

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
        double totalScore = toFixed(examSections.stream().map(ExamSection::getTotalScore).reduce(0.0, Double::sum));
        return Math.max(totalScore, 0.0);
    }

    public Double getMaxScore() {
        return toFixed(examSections.stream().map(ExamSection::getMaxScore).reduce(0.0, Double::sum));
    }

    private int getApprovedAnswerCount() {
        return examSections.stream().map(ExamSection::getApprovedCount).reduce(0, Integer::sum);
    }

    private int getRejectedAnswerCount() {
        return examSections.stream().map(ExamSection::getRejectedCount).reduce(0, Integer::sum);
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

    public String getOrganisations() {
        return organisations;
    }

    public void setOrganisations(String organisations) {
        this.organisations = organisations;
    }

    public void setAssessmentInfo(String assessmentInfo) {
        this.assessmentInfo = assessmentInfo;
    }

    /**
     * Shuffles question options for student exam.
     * Only shuffles if:
     * - Option shuffling is enabled for the question
     * - The question's type is not ClaimChoiceQuestion
     */
    private void shuffleQuestionOptions(ExamSectionQuestion esq) {
        boolean shouldShuffle =
            esq.isOptionShufflingOn() &&
            Optional.ofNullable(esq.getQuestion())
                .map(Question::getType)
                .filter(type -> type == Question.Type.ClaimChoiceQuestion)
                .isEmpty(); // Shuffle if a ClaimChoiceQuestion is NOT present

        if (shouldShuffle) {
            List<ExamSectionQuestionOption> shuffled = new ArrayList<>(esq.getOptions());
            Collections.shuffle(shuffled);
            esq.setOptions(shuffled);
        }
    }

    public Exam createCopy(ExamCopyContext context) {
        Exam clone = new Exam();

        // Copy all properties except explicitly excluded ones
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
            context.shouldExcludeExamOwners() ? "examOwners" : "none"
        );

        if (context.shouldSetParent()) {
            clone.setParent(this);
        }

        clone.setCreatorWithDate(context.getUser());
        clone.setModifierWithDate(context.getUser());
        clone.generateHash();
        clone.save();

        // Copy auto-evaluation config
        if (autoEvaluationConfig != null) {
            AutoEvaluationConfig configClone = autoEvaluationConfig.copy();
            configClone.setExam(clone);
            configClone.save();
            clone.setAutoEvaluationConfig(configClone);
        }

        // Copy exam inspections
        for (ExamInspection ei : examInspections) {
            ExamInspection inspection = new ExamInspection();
            BeanUtils.copyProperties(ei, inspection, "id", "exam");
            inspection.setExam(clone);
            inspection.save();
        }

        // Select sections to copy
        Set<ExamSection> sections = selectSectionsToCopy(context);

        // Copy sections and their content
        for (ExamSection es : sections) {
            ExamSection esCopy = es.copy(clone, context);
            esCopy.setCreatorWithDate(context.getUser());
            esCopy.setModifierWithDate(context.getUser());

            // Shuffle options if this is a student exam
            if (context.shouldShuffleOptions()) {
                esCopy.getSectionQuestions().forEach(this::shuffleQuestionOptions);
            }

            esCopy.save();

            // Update question metadata for student exams
            if (context.isStudentExam()) {
                updateQuestionMetadata(esCopy, context.getUser());
            }

            clone.getExamSections().add(esCopy);
        }

        // Copy attachment if present
        if (attachment != null) {
            Attachment copy = new Attachment();
            BeanUtils.copyProperties(attachment, copy, "id");
            clone.setAttachment(copy);
        }

        return clone;
    }

    private Set<ExamSection> selectSectionsToCopy(ExamCopyContext context) {
        var optionality = examSections.stream().map(ExamSection::isOptional).toList();
        System.out.println(optionality);
        if (context.shouldIncludeOnlySelectedSections()) {
            // For student exams with section selection, only include non-optional sections or selected optional sections
            return examSections
                .stream()
                .filter(es -> !es.isOptional() || context.getSelectedSections().contains(es.getId()))
                .sorted()
                .collect(Collectors.toCollection(LinkedHashSet::new));
        } else {
            // For teacher copies or when no sections are selected, include all sections
            return examSections.stream().sorted().collect(Collectors.toCollection(LinkedHashSet::new));
        }
    }

    private void updateQuestionMetadata(ExamSection section, User user) {
        for (ExamSectionQuestion esq : section.getSectionQuestions()) {
            Question questionCopy = esq.getQuestion();
            questionCopy.setCreatorWithDate(user);
            questionCopy.setModifierWithDate(user);
            questionCopy.update();
            esq.save();
        }
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

    public ExamFeedbackConfig getExamFeedbackConfig() {
        return examFeedbackConfig;
    }

    public void setExamFeedbackConfig(ExamFeedbackConfig examFeedbackConfig) {
        this.examFeedbackConfig = examFeedbackConfig;
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

    public Grade.Type getGradingType() {
        return gradingType;
    }

    public void setGradingType(Grade.Type gradingType) {
        this.gradingType = gradingType;
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

    private boolean isCreatedBy(User user) {
        return creator != null && creator.equals(user);
    }

    private boolean isInspectedBy(User user, boolean applyToChildOnly) {
        Exam examToCheck = parent == null || applyToChildOnly ? this : parent;
        return examToCheck.examInspections.stream().anyMatch(ei -> ei.getUser().equals(user));
    }

    private boolean isOwnedBy(User user) {
        Exam examToCheck = parent == null ? this : parent;
        return examToCheck.examOwners.stream().anyMatch(owner -> owner.equals(user));
    }

    public boolean isOwnedOrCreatedBy(User user) {
        return isCreatedBy(user) || isOwnedBy(user);
    }

    public boolean isInspectedOrCreatedOrOwnedBy(User user) {
        return isInspectedBy(user, false) || isOwnedBy(user) || isCreatedBy(user);
    }

    public boolean isChildInspectedOrCreatedOrOwnedBy(User user) {
        return isInspectedBy(user, true) || isOwnedBy(user) || isCreatedBy(user);
    }

    public boolean isViewableForLanguageInspector(User user) {
        return (
            executionType.getType().equals(ExamExecutionType.Type.MATURITY.toString()) &&
            user.hasPermission(Permission.Type.CAN_INSPECT_LANGUAGE) &&
            languageInspection != null &&
            languageInspection.getAssignee() != null
        );
    }

    public boolean isPrivate() {
        return !executionType.getType().equals(ExamExecutionType.Type.PUBLIC.toString()) && !isPrintout();
    }

    public boolean isPrintout() {
        return executionType.getType().equals(ExamExecutionType.Type.PRINTOUT.toString());
    }

    public boolean isUnsupervised() {
        return !executionType.getType().equals(Implementation.AQUARIUM.toString());
    }

    public boolean hasState(State... states) {
        return Arrays.asList(states).contains(state);
    }

    public void setDerivedMaxScores() {
        examSections
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .forEach(esq -> {
                esq.setDerivedMaxScore();
                // Also set min scores if the question is claim choice or weighted question
                Optional<Question.Type> type = Optional.ofNullable(esq.getQuestion()).map(Question::getType);
                if (
                    type.isPresent() &&
                    (type.get() == Question.Type.ClaimChoiceQuestion ||
                        type.get() == Question.Type.WeightedMultipleChoiceQuestion)
                ) {
                    esq.setDerivedMinScore();
                }
                esq.getOptions().forEach(o -> o.setScore(null));
            });
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof Exam otherExam)) {
            return false;
        }
        return new EqualsBuilder().append(id, otherExam.id).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(id).build();
    }

    @Override
    public int compareTo(@Nonnull Exam other) {
        return created.compareTo(other.created);
    }
}
