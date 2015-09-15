package models;

import com.avaje.ebean.annotation.EnumMapping;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.questions.Answer;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;
import util.AppUtil;

import javax.annotation.Nonnull;
import javax.persistence.*;
import java.util.*;

@Entity
public class Exam extends OwnedModel implements Comparable<Exam> {

    @EnumMapping(integerType = true, nameValuePairs = "DRAFT=1, SAVED=2, PUBLISHED=3, STUDENT_STARTED=4, REVIEW=5, " +
            "REVIEW_STARTED=6, GRADED=7, GRADED_LOGGED=8, ARCHIVED=9, ABORTED=10, DELETED=11")
    public enum State {
        DRAFT,
        SAVED,
        PUBLISHED,       // EXAM PUBLISHED, VISIBLE TO STUDENTS AND READY FOR TAKING
        STUDENT_STARTED, // EXAM STARTED BY STUDENT
        REVIEW,          // EXAM RETURNED BY STUDENT AND READY FOR REVIEW
        REVIEW_STARTED,  // REVIEW STARTED BY TEACHERS
        GRADED,          // GRADE GIVEN
        GRADED_LOGGED,   // EXAM PROCESSED AND READY FOR REGISTRATION
        ARCHIVED,        // EXAM ARCHIVED FOR CERTAIN PERIOD AFTER WHICH IT GETS DELETED
        ABORTED,         // EXAM ABORTED BY STUDENT WHILST TAKING
        DELETED          // EXAM MARKED AS DELETED AND HIDDEN FROM END USERS
    }

    private String name;

    @ManyToOne
    private Course course;

    @ManyToOne
    private ExamType examType;

    @ManyToMany
    @JoinTable(name = "exam_owner", joinColumns = @JoinColumn(name = "exam_id"), inverseJoinColumns = @JoinColumn(name = "user_id"))
    private List<User> examOwners;

    @ManyToMany
    @JoinTable(name = "exam_inspection", joinColumns = @JoinColumn(name = "exam_id"), inverseJoinColumns = @JoinColumn(name = "user_id"))
    private List<User> examInspectors;

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
    private List<ExamSection> examSections;

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
    private List<ExamInspection> examInspections;

    @OneToOne(mappedBy = "exam")
    private ExamRecord examRecord;

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
    private Grade grade; // TODO: make this a Grade instead of String

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

    public User getGradedByUser() {
        return gradedByUser;
    }

    public void setGradedByUser(User gradedByUser) {
        this.gradedByUser = gradedByUser;
    }

    // Aggregate properties, required as fields by Ebean
    private Double totalScore;
    private Double maxScore;
    private int rejectedAnswerCount;
    private int approvedAnswerCount;

    // Cloned - needed as field for serialization :(
    private Boolean cloned;

    @Transient
    public Double getTotalScore() {
        double total = 0;
        for (ExamSection section : examSections) {
            for (ExamSectionQuestion esq : section.getSectionQuestions()) {
                Question question = esq.getQuestion();
                Double evaluatedScore = null;
                switch (question.getType()) {
                    case EssayQuestion:
                        if (question.getEvaluationType() != null && question.getEvaluationType().equals("Points")) {
                            evaluatedScore = question.getEvaluatedScore();
                        }
                        break;
                    case MultipleChoiceQuestion:
                        if (question.getAnswer() != null) {
                            Answer answer = question.getAnswer();
                            evaluatedScore = answer.getOptions().get(0).isCorrectOption() ? question.getMaxScore() : 0;
                        }
                        break;
                    case WeightedMultipleChoiceQuestion:
                        if (question.getAnswer() != null) {
                            Answer answer = question.getAnswer();
                            evaluatedScore = answer.getOptions().stream().map(MultipleChoiceOption::getScore)
                                    .reduce(0.0, (sum, x) -> sum += x);
                            // ATM minimum score is zero
                            if (evaluatedScore < 0) {
                                evaluatedScore = 0.0;
                            }
                        }
                        break;
                }
                if (evaluatedScore != null) {
                    total += evaluatedScore;
                }
            }
        }
        return total;
    }

    public List<User> getExamOwners() {
        return examOwners;
    }

    public void setExamOwners(List<User> examOwners) {
        this.examOwners = examOwners;
    }

    @Transient
    public Double getMaxScore() {
        double total = 0;
        for (ExamSection section : examSections) {
            for (ExamSectionQuestion esq : section.getSectionQuestions()) {
                Question question = esq.getQuestion();
                double maxScore = 0;
                switch (question.getType()) {
                    case EssayQuestion:
                        if (question.getEvaluationType() != null && question.getEvaluationType().equals("Points")) {
                            maxScore = question.getMaxScore();
                        }
                        break;
                    case MultipleChoiceQuestion:
                        maxScore = question.getMaxScore();
                        break;
                    case WeightedMultipleChoiceQuestion:
                        maxScore = question.getOptions().stream()
                                .map(MultipleChoiceOption::getScore)
                                .filter(o -> o > 0)
                                .reduce(0.0, (sum, x) -> sum += x);
                        break;
                }
                total += maxScore;
            }
        }
        return total;
    }

    @Transient
    public int getApprovedAnswerCount() {
        int total = 0;
        for (ExamSection section : examSections) {
            for (ExamSectionQuestion esq : section.getSectionQuestions()) {
                Question question = esq.getQuestion();
                if (question.getType() == Question.Type.EssayQuestion) {
                    if (question.getEvaluationType() != null &&
                            question.getEvaluationType().equals("Select")
                            && question.getEvaluatedScore() != null
                            && question.getEvaluatedScore() == 1) {
                        total++;
                    }
                }
            }
        }
        return total;
    }

    @Transient
    public int getRejectedAnswerCount() {
        int total = 0;
        for (ExamSection section : examSections) {
            for (ExamSectionQuestion esq : section.getSectionQuestions()) {
                Question question = esq.getQuestion();
                if (question.getType() == Question.Type.EssayQuestion) {
                    if (question.getEvaluationType() != null &&
                            question.getEvaluationType().equals("Select") &&
                            question.getEvaluatedScore() != null
                            && question.getEvaluatedScore() == 0) {
                        total++;
                    }
                }
            }
        }
        return total;
    }


    // This is dumb, required to be explicitly set by EBean
    public void setTotalScore() {
        totalScore = getTotalScore();
    }

    // This is dumb, required to be explicitly set by EBean
    public void setMaxScore() {
        maxScore = getMaxScore();
    }

    // This is dumb, required to be explicitly set by EBean
    public void setRejectedAnswerCount() {
        rejectedAnswerCount = getRejectedAnswerCount();
    }

    // This is dumb, required to be explicitly set by EBean
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

    public List<ExamSection> getExamSections() {
        return examSections;
    }

    public void setExamSections(List<ExamSection> examSections) {
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

    public List<ExamInspection> getExamInspections() {
        return examInspections;
    }

    public void setExamInspections(List<ExamInspection> examInspections) {
        this.examInspections = examInspections;
    }

    public Exam copy(User user, boolean produceStudentExam) {
        Exam clone = new Exam();
        BeanUtils.copyProperties(this, clone, "id", "examSections", "examEnrolments", "examParticipations",
                "examInspections", "creator", "created", produceStudentExam ? "examOwners" : "none");
        clone.setParent(this);
        AppUtil.setCreator(clone, user);
        AppUtil.setModifier(clone, user);
        clone.generateHash();
        clone.save();

        for (ExamInspection ei : examInspections) {
            ExamInspection inspection = new ExamInspection();
            BeanUtils.copyProperties(ei, inspection, "id", "exam");
            inspection.setExam(clone);
            inspection.save();
        }
        for (ExamSection es : examSections) {
            ExamSection esCopy = es.copy(clone, produceStudentExam);
            esCopy.save();
            for (ExamSectionQuestion esq : esCopy.getSectionQuestions()) {
                esq.getQuestion().save();
                esq.save();
            }
            clone.getExamSections().add(esCopy);
        }
        if (attachment != null) {
            Attachment copy = new Attachment();
            BeanUtils.copyProperties(attachment, copy, "id");
            clone.setAttachment(copy);
        }
        Collections.sort(clone.getExamSections(), (o1, o2) -> (int) (o1.getId() - o2.getId()));
        return clone;
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

    @Transient
    public boolean isCreatedBy(User user) {
        return creator != null && creator.equals(user);
    }

    @Transient
    public boolean isInspectedBy(User user, boolean applyToChildOnly) {
        Exam examToCheck = parent == null || applyToChildOnly ? this : parent;
        return examToCheck.examInspections.stream().anyMatch(ei -> ei.getUser().equals(user));
    }

    @Transient
    public boolean isOwnedBy(User user) {
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
    public boolean isInspectedOrCreatedOrOwnedBy(User user, boolean applyToChildOnly) {
        return isInspectedBy(user, applyToChildOnly) || isOwnedBy(user) || isCreatedBy(user);
    }

    @Transient
    public boolean isPrivate() {
        return executionType.getType().equals(ExamExecutionType.Type.PRIVATE.toString());
    }

    @Transient
    public boolean hasState(State... states) {
        return Arrays.asList(states).contains(state);
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
}
