package models;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.FetchConfig;
import com.avaje.ebean.Query;
import com.avaje.ebean.annotation.EnumMapping;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.api.AttachmentContainer;
import models.base.OwnedModel;
import models.questions.Question;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;
import util.AppUtil;

import javax.annotation.Nonnull;
import javax.persistence.*;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.TreeSet;

@Entity
public class Exam extends OwnedModel implements Comparable<Exam>, AttachmentContainer {

    @EnumMapping(integerType = true, nameValuePairs = "DRAFT=1, SAVED=2, PUBLISHED=3, STUDENT_STARTED=4, REVIEW=5, " +
            "REVIEW_STARTED=6, GRADED=7, GRADED_LOGGED=8, ARCHIVED=9, ABORTED=10, DELETED=11, REJECTED=12")
    public enum State {
        DRAFT,
        SAVED,
        PUBLISHED,       // EXAM PUBLISHED, VISIBLE TO STUDENTS AND READY FOR TAKING
        STUDENT_STARTED, // EXAM STARTED BY STUDENT
        REVIEW,          // EXAM RETURNED BY STUDENT AND READY FOR REVIEW
        REVIEW_STARTED,  // REVIEW STARTED BY TEACHERS
        GRADED,          // GRADE GIVEN
        /* FINAL STATES */
        GRADED_LOGGED,   // EXAM PROCESSED AND READY FOR REGISTRATION
        ARCHIVED,        // EXAM ARCHIVED FOR CERTAIN PERIOD AFTER WHICH IT GETS DELETED
        ABORTED,         // EXAM ABORTED BY STUDENT WHILST TAKING
        DELETED,         // EXAM MARKED AS DELETED AND HIDDEN FROM END USERS
        REJECTED         // EXAM NOT QUALIFIED FOR REGISTRATION
    }

    private String name;

    @ManyToOne
    private Course course;

    @ManyToOne
    private ExamType examType;

    @ManyToMany
    @JoinTable(name = "exam_owner", joinColumns = @JoinColumn(name = "exam_id"), inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> examOwners;

    // Instruction written by teacher, shown during exam
    @Column(columnDefinition = "TEXT")
    private String instruction;

    // Instruction written by teacher, shown for reservation purposes
    @Column(columnDefinition = "TEXT")
    private String enrollInstruction;

    private boolean shared;

    // An ExamSection may be used only in one Exam
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private Set<ExamSection> examSections;

    @ManyToOne(cascade = CascadeType.PERSIST)
    protected Exam parent;

    @OneToMany(mappedBy = "parent")
    @JsonBackReference
    protected List<Exam> children;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private List<ExamEnrolment> examEnrolments;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private List<ExamParticipation> examParticipations;

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
    private Date examActiveStartDate;

    // Exam valid/enrollable until
    @Temporal(TemporalType.TIMESTAMP)
    private Date examActiveEndDate;

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

    @ManyToOne
    private Grade grade;

    // Ohjelmistot
    @ManyToMany(cascade = CascadeType.ALL)
    private List<Software> softwares;

    /*
     * this is the user who is marked as evaluator of the Exam
     * in WebOodi, or other system
     */
    @JsonBackReference
    @ManyToOne
    private User gradedByUser;

    @Temporal(TemporalType.TIMESTAMP)
    private Date gradedTime;

    @OneToOne
    private Comment examFeedback;

    private String additionalInfo;

    // Number of times a student is allowed to take the exam before getting a grade
    private Integer trialCount;

    @ManyToOne
    private ExamType creditType;

    @ManyToOne
    private ExamExecutionType executionType;

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    private boolean expanded;

    @OneToOne(cascade = CascadeType.ALL)
    private Attachment attachment;

    @Temporal(TemporalType.TIMESTAMP)
    private Date autoEvaluationNotified;

    private boolean gradeless;

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

    // Aggregate properties, required as fields by Ebean
    @Transient
    private Double totalScore;
    @Transient
    private Double maxScore;
    @Transient
    private int rejectedAnswerCount;
    @Transient
    private int approvedAnswerCount;

    // Cloned - needed as field for serialization :(
    private Boolean cloned;

    public Double getTotalScore() {
        return examSections.stream()
                .map(ExamSection::getTotalScore)
                .reduce(0.0, (sum, x) -> sum += x);
    }

    public Double getMaxScore() {
        return examSections.stream()
                .map(ExamSection::getMaxScore)
                .reduce(0.0, (sum, x) -> sum += x);
    }

    private int getApprovedAnswerCount() {
        return examSections.stream()
                .map(ExamSection::getApprovedCount)
                .reduce(0, (sum, x) -> sum += x);
    }

    private int getRejectedAnswerCount() {
        return examSections.stream()
                .map(ExamSection::getRejectedCount)
                .reduce(0, (sum, x) -> sum += x);
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

    @Transient
    public Boolean isCloned() {
        return cloned;
    }

    public void setCloned(Boolean cloned) {
        this.cloned = cloned;
    }

    public Date getGradedTime() {
        return gradedTime;
    }

    public void setGradedTime(Date gradedTime) {
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

    public String generateHash() {
        String attributes = name + state + new Random().nextDouble();
        hash = AppUtil.encodeMD5(attributes);
        return hash;
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

    public List<ExamParticipation> getExamParticipations() {
        return examParticipations;
    }

    public void setExamParticipations(List<ExamParticipation> examParticipations) {
        this.examParticipations = examParticipations;
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

    private Exam createCopy(User user, boolean produceStudentExam) {
        Exam clone = new Exam();
        BeanUtils.copyProperties(this, clone, "id", "examSections", "examEnrolments", "examParticipations",
                "examInspections", "autoEvaluationConfig", "creator", "created", produceStudentExam ? "examOwners" : "none");
        clone.setParent(this);
        AppUtil.setCreator(clone, user);
        AppUtil.setModifier(clone, user);
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
        sections.addAll(examSections);
        for (ExamSection es : sections) {
            ExamSection esCopy = es.copy(clone, produceStudentExam);
            AppUtil.setCreator(esCopy, user);
            AppUtil.setModifier(esCopy, user);
            esCopy.save();
            for (ExamSectionQuestion esq : esCopy.getSectionQuestions()) {
                if (produceStudentExam) {
                    Question questionCopy = esq.getQuestion();
                    AppUtil.setCreator(questionCopy, user);
                    AppUtil.setModifier(questionCopy, user);
                    questionCopy.update();
                }
                esq.save();
                esq.getOptions().forEach(ExamSectionQuestionOption::save);
            }
            clone.getExamSections().add(esCopy);
        }
        if (attachment != null) {
            Attachment copy = new Attachment();
            BeanUtils.copyProperties(attachment, copy, "id");
            clone.setAttachment(copy);
        }
        // do we need this at all?
        clone.setExamSections(new TreeSet<>(clone.getExamSections()));
        return clone;
    }

    public Exam copyForStudent(User student) {
        return createCopy(student, true);
    }

    public Exam copy(User user) {
        return createCopy(user, false);
    }

    public Date getExamActiveStartDate() {
        return examActiveStartDate;
    }

    public void setExamActiveStartDate(Date examActiveStartDate) {
        this.examActiveStartDate = examActiveStartDate;
    }

    public Date getExamActiveEndDate() {
        return examActiveEndDate;
    }

    public void setExamActiveEndDate(Date examActiveEndDate) {
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

    public Date getAutoEvaluationNotified() {
        return autoEvaluationNotified;
    }

    public void setAutoEvaluationNotified(Date autoEvaluationNotified) {
        this.autoEvaluationNotified = autoEvaluationNotified;
    }

    public boolean isGradeless() {
        return gradeless;
    }

    public void setGradeless(boolean gradeless) {
        this.gradeless = gradeless;
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
        return executionType.getType().equals(ExamExecutionType.Type.MATURITY.toString()) &&
                user.hasPermission(Permission.Type.CAN_INSPECT_LANGUAGE) && languageInspection != null &&
                languageInspection.getAssignee() != null;
    }

    @Transient
    public boolean isPrivate() {
        return !executionType.getType().equals(ExamExecutionType.Type.PUBLIC.toString());
    }

    @Transient
    public boolean hasState(State... states) {
        return Arrays.asList(states).contains(state);
    }

    @Transient
    public void setDerivedMaxScores() {
        examSections.stream()
                .flatMap(es -> es.getSectionQuestions().stream())
                .forEach(esq -> {
                    esq.setDerivedMaxScore();
                    esq.getOptions().stream()
                            .forEach(o -> o.setScore(null));
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
        return "Exam{" +
                "course=" + course +
                ", id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", examType=" + examType +
                ", hash='" + hash + '\'' +
                ", state='" + state + '\'' +
                '}';
    }

    @Override
    public int compareTo(@Nonnull Exam other) {
        return created.compareTo(other.created);
    }

    private static Query<Exam> createQuery() {
        return Ebean.find(Exam.class)
                .fetch("course")
                .fetch("course.organisation")
                .fetch("course.gradeScale")
                .fetch("course.gradeScale.grades", new FetchConfig().query())
                .fetch("parent")
                .fetch("parent.creator")
                .fetch("parent.gradeScale")
                .fetch("parent.gradeScale.grades", new FetchConfig().query())
                .fetch("parent.examOwners", new FetchConfig().query())
                .fetch("examType")
                .fetch("executionType")
                .fetch("examSections")
                .fetch("examSections.sectionQuestions", "sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType")
                .fetch("examSections.sectionQuestions.question", "id, type, question, shared")
                .fetch("examSections.sectionQuestions.question.attachment", "fileName")
                .fetch("examSections.sectionQuestions.options")
                .fetch("examSections.sectionQuestions.options.option", "id, option, correctOption")
                .fetch("examSections.sectionQuestions.essayAnswer", "id, answer, evaluatedScore")
                .fetch("examSections.sectionQuestions.essayAnswer.attachment", "fileName")
                .fetch("gradeScale")
                .fetch("gradeScale.grades")
                .fetch("grade")
                .fetch("languageInspection")
                .fetch("languageInspection.assignee", "firstName, lastName, email")
                .fetch("languageInspection.statement")
                .fetch("languageInspection.statement.attachment")
                .fetch("examFeedback")
                .fetch("examFeedback.attachment")
                .fetch("creditType")
                .fetch("attachment")
                .fetch("examLanguages")
                .fetch("examOwners");
    }
}
