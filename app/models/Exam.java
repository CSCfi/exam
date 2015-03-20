package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.answers.MultipleChoiseAnswer;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import org.springframework.beans.BeanUtils;
import util.SitnetUtil;

import javax.persistence.*;
import java.util.*;

@Entity
public class Exam extends SitnetModel {

    public enum State {
        DRAFT,
        SAVED,
        PUBLISHED,
        REVIEW,          // OPISKELIJHA ON PALAUTTANUT TENTIN
        REVIEW_STARTED,  // OPETTAJA ON ALOITTANUT ARVIOINNIN
        GRADED,
        GRADED_LOGGED,   // OPINTOSUORITUS KIRJATTU JOHONKIN JÄRJESTELMÄÄN
        STUDENT_STARTED,
        ABORTED,
        ARCHIVED,
        DELETED
    }

    private String name;

    @ManyToOne
    private Course course;

    @ManyToOne
    private ExamType examType;

    @ManyToMany
    @JoinTable(name = "exam_owner", joinColumns = @JoinColumn(name="exam_id"), inverseJoinColumns = @JoinColumn(name = "user_id"))
    private List<User> examOwners = new ArrayList<>();

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
    private List<ExamSection> examSections = new ArrayList<>();

    @ManyToOne
    private Exam parent;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private List<ExamEnrolment> examEnrolments = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private List<ExamParticipation> examParticipations = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private List<ExamInspection> examInspections = new ArrayList<>();

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

    // Aggregate properties, required as fields by Ebean
    private Double totalScore;
    private Double maxScore;
    private int rejectedAnswerCount;
    private int approvedAnswerCount;


    // Cloned - needed as field for serialization :(
    private Boolean cloned;

    // Exam language
    @ManyToMany
    private List<Language> examLanguages = new ArrayList<>();

    // Exam answer language
    private String answerLanguage;

    private String state;

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

    @ManyToOne
    private ExamType creditType;

    // In UI, section has been expanded
    @Column(columnDefinition = "boolean default false")
    private boolean expanded;

    @OneToOne(cascade = CascadeType.ALL)
    protected Attachment attachment;

    public User getGradedByUser() {
        return gradedByUser;
    }

    public void setGradedByUser(User gradedByUser) {
        this.gradedByUser = gradedByUser;
    }

    @Transient
    public Double getTotalScore() {
        double total = 0;
        for (ExamSection section : examSections) {
            for (ExamSectionQuestion esq : section.getSectionQuestions()) {
                AbstractQuestion question = esq.getQuestion();
                Double evaluatedScore = null;
                if (question instanceof EssayQuestion) {
                    EssayQuestion essayQuestion = (EssayQuestion) question;
                    if (essayQuestion.getEvaluationType().equals("Points")) {
                        evaluatedScore = essayQuestion.getEvaluatedScore();
                    }
                } else if (question.getAnswer() != null) {
                    MultipleChoiseAnswer answer = (MultipleChoiseAnswer) question.getAnswer();
                    evaluatedScore = answer.getOption().isCorrectOption() ? question.getMaxScore() : 0;
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
                AbstractQuestion question = esq.getQuestion();
                double maxScore = 0;
                if (question instanceof EssayQuestion) {
                    EssayQuestion essayQuestion = (EssayQuestion) question;
                    if (essayQuestion.getEvaluationType().equals("Points")) {
                        maxScore = essayQuestion.getMaxScore();
                    }
                } else {
                    maxScore = question.getMaxScore();
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
                AbstractQuestion question = esq.getQuestion();
                if (question instanceof EssayQuestion) {
                    EssayQuestion essayQuestion = (EssayQuestion) question;
                    if (essayQuestion.getEvaluationType().equals("Select") && essayQuestion.getEvaluatedScore() == 1) {
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
                AbstractQuestion question = esq.getQuestion();
                if (question instanceof EssayQuestion) {
                    EssayQuestion essayQuestion = (EssayQuestion) question;
                    if (essayQuestion.getEvaluationType().equals("Points") && essayQuestion.getEvaluatedScore() == 0) {
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
        hash = SitnetUtil.encodeMD5(attributes);
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

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public Comment getExamFeedback() {
        return examFeedback;
    }

    public void setExamFeedback(Comment examFeedback) {
        this.examFeedback = examFeedback;
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

    public List<ExamInspection> getExamInspections() {
        return examInspections;
    }

    public void setExamInspections(List<ExamInspection> examInspections) {
        this.examInspections = examInspections;
    }

    public Exam copy() {
        Exam clone = new Exam();
        BeanUtils.copyProperties(this, clone, new String[]{"id", "examSections", "examEnrolments", "examParticipations",
                "examInspections", "creator", "created"});
        clone.setParent(this);
        SitnetUtil.setCreator(clone);
        SitnetUtil.setModifier(clone);
        clone.save();
        clone.generateHash();

        for (ExamSection es : examSections) {
            ExamSection esCopy = es.copy(clone, true);
            esCopy.save();
            for (ExamSectionQuestion esq : esCopy.getSectionQuestions()) {
                esq.getQuestion().save();
                esq.save();
            }
            clone.getExamSections().add(esCopy);
        }
        Collections.sort(clone.getExamSections(), new Comparator<ExamSection>() {
            @Override
            public int compare(ExamSection o1, ExamSection o2) {
                return (int) (o1.getId() - o2.getId());
            }
        });
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

    @Transient
    public boolean isCreatedBy(User user) {
        return creator != null && creator.getId().equals(user.getId());
    }

    @Transient
    public boolean isInspectedBy(User user) {
        Exam examToCheck = parent == null ? this : parent;
        for (ExamInspection inspection : examToCheck.examInspections) {
            if (inspection.getUser().equals(user)) {
                return true;
            }
        }
        return false;
    }

    @Transient
    public boolean isOwnedBy(User user) {
        Exam examToCheck = parent == null ? this : parent;
        for (User owner : examToCheck.examOwners) {
            if (owner.equals(user)) {
                return true;
            }
        }
        return false;
    }

    @Transient
    public boolean isOwnedOrCreatedBy(User user) {
        return isCreatedBy(user) || isOwnedBy(user);
    }

    @Transient
    public boolean isInspectedOrCreatedOrOwnedBy(User user) {
        return isInspectedBy(user) || isOwnedBy(user) || isCreatedBy(user);
    }

    @Override
    public String toString() {
        return "Exam{" +
                "course=" + course +
                ", id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", state='" + state + '\'' +
                ", examType=" + examType +
                ", instruction='" + instruction + '\'' +
                ", shared=" + shared +
                ", hash='" + hash + '\'' +
                ", state='" + state + '\'' +
                '}';
    }
}
