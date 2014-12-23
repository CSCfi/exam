package models;

import annotations.NonCloneable;
import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.questions.AbstractQuestion;
import models.questions.MultipleChoiceQuestion;
import models.questions.MultipleChoiseOption;
import util.SitnetUtil;

import javax.persistence.*;
import java.sql.Timestamp;
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
    @NonCloneable
    private Course course;

    @OneToOne
    @NonCloneable
    private ExamType examType;
    
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

    /*
     *  Kun opiskelijalle tehdään kopio tentistä, tämä tulee viittaamaan alkuperäiseen tenttiin
     *  
     *  Lisäksi tentaattori pitää löytää joukko tenttejä, jotka ovat suoritettuja, jotka pitää tarkistaa
     *  tätä viitettä voidaan käyttää niiden tenttien löytämiseen  
     */
    @OneToOne
    @NonCloneable
    private Exam parent;


    @Column(length = 32, unique = true)
    private String hash;

    // tentin voimassaoloaika, tentti on avoin opiskelijoille tästä lähtien
    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp examActiveStartDate;
    
    // tentin voimassaoloaika, tentti sulkeutuu
    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp examActiveEndDate;

    // Akvaario
    @OneToOne
    private ExamRoom room;

    // tentin kesto
//    @Constraints.Required
    private Integer duration;

    // Exam grading, e.g. 0-5
    private String grading;

    // Custom course credit - if teachers changes course credit
    private Double customCredit;

    // Exam total score - calculated from all section scores
    private Double totalScore;

    // Exam language
    private String examLanguage;

    // Exam answer language
    private String answerLanguage;
    
    private String state;

    private String grade;

    // Ohjelmistot
    @ManyToMany(cascade = CascadeType.ALL)
    private List<Software> softwares;

    /*
     * this is the user who is marked as evaluator of the Exam
     * in WebOodi, or other system
     */
    @JsonBackReference
    @NonCloneable
    @OneToOne
    private User gradedByUser;

    @Temporal(TemporalType.TIMESTAMP)
    private Timestamp gradedTime;

    @OneToOne
    private Comment examFeedback;

    @OneToOne
    private Grade examGrade;

    private String creditType;

    // In UI, section has been expanded
    @Column(columnDefinition="boolean default false")
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
        if (examSections != null) {
            for (ExamSection section : examSections) {
                for (ExamSectionQuestion esq : section.getSectionQuestions()) {
                    Double score = esq.getQuestion().getEvaluatedScore();
                    total += score == null ? 0 : score;
                }
            }
        }
        return total;
    }

    public Grade getExamGrade() {
        return examGrade;
    }

    public void setExamGrade(Grade examGrade) {
        this.examGrade = examGrade;
    }

    public Timestamp getGradedTime() {
        return gradedTime;
    }

    public void setGradedTime(Timestamp gradedTime) {
        this.gradedTime = gradedTime;
    }

    public boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(boolean expanded) {
        this.expanded = expanded;
    }

    public void setRoom(ExamRoom room) {
        this.room = room;
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

	public ExamRoom getRoom() {
		return room;
	}

	public Integer getDuration() {
		return duration;
	}

	public void setDuration(Integer duration) {
		this.duration = duration;
	}

	public String getGrading() {
		return grading;
	}

	public void setGrading(String grading) {
		this.grading = grading;
	}

	public Double getCustomCredit() {
		return customCredit;
	}

	public void setCustomCredit(Double customCredit) {
		this.customCredit = customCredit;
	}

    public void setTotalScore(Double totalScore) {
        this.totalScore = totalScore;
    }

    public String getExamLanguage() {
		return examLanguage;
	}

	public void setExamLanguage(String examLanguage) {
		this.examLanguage = examLanguage;
	}

	public String getAnswerLanguage() {
		return answerLanguage;
	}

	public void setAnswerLanguage(String answerLanguage) {
		this.answerLanguage = answerLanguage;
	}

    public String generateHash() {

        Random rand = new Random();

        // TODO: what attributes make examEvent unique?
        // create unique hash for exam
        String attributes = name + state + new String(rand.nextDouble()+"");

        this.hash = SitnetUtil.encodeMD5(attributes);
        play.Logger.debug("Exam hash: " + this.hash);
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

	public String getGrade() {
		return grade;
	}

	public void setGrade(String grade) {
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

    public String getCreditType() {
        return creditType;
    }

    public void setCreditType(String creditType) {
        this.creditType = creditType;
    }

    public List<Software> getSoftwareInfo() {
        return softwares;
    }

    public void setSoftwareInfo(List<Software> softwareInfo) {
        this.softwares = softwareInfo;
    }

    @Override
    public Object clone() {

//        Exam clone = (Exam)SitnetUtil.getClone(this);

        Exam clone = new Exam();

        clone.setCreated(this.getCreated());
//        clone.setCreator(this.getCreator());
        clone.setModified(this.getModified());
        clone.setModifier(this.getModifier());
        clone.setName(this.getName());
        clone.setCourse(this.getCourse());
        clone.setExamType(this.getExamType());
        clone.setInstruction(this.getInstruction());
        clone.setShared(this.isShared());
        clone.setRoom(this.getRoom());
        clone.setDuration(this.getDuration());
        clone.setGrading(this.getGrading());
        clone.setTotalScore(this.getTotalScore());
        clone.setExamLanguage(this.getExamLanguage());
        clone.setAnswerLanguage(this.getAnswerLanguage());
        clone.setGrade(this.getGrade());
        clone.setExamFeedback(this.getExamFeedback());
        clone.setCreditType(this.getCreditType());
        clone.setParent(this);
        clone.setAttachment(this.getAttachment());
        SitnetUtil.setModifier(clone);
        clone.save();

        List<ExamSection> examSections = this.getExamSections();
        List<ExamSection> examSectionCopies = new ArrayList<>();

        Collections.sort(examSections, sortSectionsById());

        for (ExamSection es : examSections) {

            ExamSection esCopy = (ExamSection)es._ebean_createCopy();
            esCopy.setId(null);
            esCopy.setExam(clone);
            SitnetUtil.setModifier(esCopy);
            esCopy.save();
            List<ExamSectionQuestion> sectionQuestions = new ArrayList<>(es.getSectionQuestions());
            if (es.getLotteryOn()) {
                Collections.shuffle(sectionQuestions);
                sectionQuestions = sectionQuestions.subList(0, es.getLotteryItemCount());
            }
            Collections.sort(sectionQuestions, sortBySequence());

            for (ExamSectionQuestion esq : sectionQuestions) {
                AbstractQuestion question = esq.getQuestion();
                AbstractQuestion questionCopy = (AbstractQuestion)question._ebean_createCopy();
                questionCopy.setId(null);
                questionCopy.setParent(question);
                SitnetUtil.setModifier(questionCopy);
                switch (question.getType()) {
                    case "MultipleChoiceQuestion": {
                        List<MultipleChoiseOption> multipleChoiceOptionCopies = new ArrayList<>();
                        List<MultipleChoiseOption> options = ((MultipleChoiceQuestion) question).getOptions();
                        for (MultipleChoiseOption o : options) {
                            MultipleChoiseOption m_option_copy = (MultipleChoiseOption)o._ebean_createCopy();
                            m_option_copy.setId(null);
                            multipleChoiceOptionCopies.add(m_option_copy);
                        }
                        ((MultipleChoiceQuestion)questionCopy).setOptions(multipleChoiceOptionCopies);
                        questionCopy.save();
                    }break;

                    case "EssayQuestion": {
                        // No need to implement because EssayQuestion doesn't have object relations
                        questionCopy.save();
                    } break;

                }
                ExamSectionQuestion esqCopy = new ExamSectionQuestion(esCopy, questionCopy);
                esqCopy.setSequenceNumber(esq.getSequenceNumber());
                esqCopy.save();
            }
            examSectionCopies.add(esCopy);
        }

        Collections.sort(examSectionCopies, sortSectionsById());

        clone.setExamSections(examSectionCopies);
        clone.generateHash();

        return clone;
    }

    private static Comparator<ExamSection> sortSectionsById() {
        return new Comparator<ExamSection>() {
            @Override
            public int compare(ExamSection o1, ExamSection o2) {
                return (int) (o1.getId() - o2.getId());
            }
        };
    }

    private static Comparator<ExamSectionQuestion> sortBySequence() {
        return new Comparator<ExamSectionQuestion>() {
            @Override
            public int compare(ExamSectionQuestion o1, ExamSectionQuestion o2) {
                return o1.getSequenceNumber() - o2.getSequenceNumber();
            }
        };
    }

    public Timestamp getExamActiveStartDate() {
        return examActiveStartDate;
    }

    public void setExamActiveStartDate(Timestamp examActiveStartDate) {
        this.examActiveStartDate = examActiveStartDate;
    }

    public Timestamp getExamActiveEndDate() {
        return examActiveEndDate;
    }

    public void setExamActiveEndDate(Timestamp examActiveEndDate) {
        this.examActiveEndDate = examActiveEndDate;
    }

    public void setAttachment(Attachment attachment) {
        this.attachment = attachment;
    }

    public Attachment getAttachment() {
        return this.attachment;
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
