package models;

import annotations.NonCloneable;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.questions.AbstractQuestion;
import models.questions.MultipleChoiceQuestion;
import models.questions.MultipleChoiseOption;
import util.SitnetUtil;

import javax.persistence.*;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/*
 * HUOM tämä luokka ei ole Tentin toteutus, vaan tentin tietomalli
 * 
 * Kuvaa Sitnettiin tallennettavan tentin rakenteen
 * 
 */
@Entity
public class Exam extends SitnetModel {

    private String name;

    // this should be @OneToOne
    @ManyToOne
    @NonCloneable
    private Course course;

    private ExamType examType;
    
    // Opettajan antama ohje Opiskelijalle tentin suorittamista varten
    private String instruction;

    private boolean shared;

    // An ExamSection may be used only in one Exam
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "exam")
    @JsonManagedReference
    private List<ExamSection> examSections;

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
    private String room;

    // tentin kesto
    private Double duration;

    // Exam grading, e.g. 0-5
    private String grading;

    // Free text for exam grading
    private String otherGrading;

    // Exam total score - calculated from all section scores
    private String totalScore;

    // Exam language
    private String examLanguage;

    // Exam answer language
    private String answerLanguage;
    
    private String state;

    private String grade;

    @OneToOne
    private ExamInspection examInspection;

    // In UI, section has been expanded
    private Boolean expanded;

    @Transient
    public double getTotalScore() {
        double total = 0;
        if (examSections != null) {
            for (ExamSection section : examSections) {
                if (section != null && section.getQuestions() != null) {
                    List<AbstractQuestion> questions = section.getQuestions();
                    for (AbstractQuestion question : questions) {
                        if (question != null && question.getEvaluatedScore() != null) {
                            total += question.getEvaluatedScore();
                        }
                    }
                }
            }
        }
        return total;
    }


    public Boolean getExpanded() {
        return expanded;
    }

    public void setExpanded(Boolean expanded) {
        this.expanded = expanded;
    }

    public void setRoom(String room) {
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

	public String getRoom() {
		return room;
	}

	public Double getDuration() {
		return duration;
	}

	public void setDuration(Double duration) {
		this.duration = duration;
	}

	public String getGrading() {
		return grading;
	}

	public void setGrading(String grading) {
		this.grading = grading;
	}

	public String getOtherGrading() {
		return otherGrading;
	}

	public void setOtherGrading(String otherGrading) {
		this.otherGrading = otherGrading;
	}

//    public String getTotalScore() { return totalScore; }

    public void setTotalScore(String totalScore) {
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

    public ExamInspection getExamInspection() {
        return examInspection;
    }

    public void setExamInspection(ExamInspection examInspection) {
        this.examInspection = examInspection;
    }

    @Override
    public Object clone() {

//        return SitnetUtil.getClone(this);

        Exam clone = new Exam();

//        Exam clone = (Exam)SitnetUtil.getClone(this);

//        clone.setState("STUDENT_STARTED");
//        clone.generateHash();

        // Causes infinite recursion
//        clone.setStudent(UserController.getLoggedUser());
        clone.setCreated(this.getCreated());
        clone.setCreator(this.getCreator());
        clone.setModified(this.getModified());
        clone.setModifier(this.getModifier());
        clone.setCourse(this.getCourse());
        clone.setName(this.getName());
        clone.setExamType(this.getExamType());
        clone.setInstruction(this.getInstruction());
        clone.setShared(this.isShared());
        clone.setGrading(this.getGrading());

        List<ExamSection> examSectionsCopies = createNewExamSectionList();

        for (ExamSection es : this.getExamSections()) {

            // New arrays are needed for every examsection
            List<AbstractQuestion> examQuestionCopies = createNewExamQuestionList();

            ExamSection examsec_copy = (ExamSection)es._ebean_createCopy();
            examsec_copy.setId(null);

            for (AbstractQuestion q : es.getQuestions()) {

                AbstractQuestion question_copy = (AbstractQuestion)q._ebean_createCopy();
                question_copy.setId(null);
                question_copy.setParent(q);

                    switch (q.getType()) {
                        case "MultipleChoiceQuestion": {
                            List<MultipleChoiseOption> multipleChoiceOptionCopies = createNewMultipleChoiceOptionList();


                            List<MultipleChoiseOption> options = ((MultipleChoiceQuestion) q).getOptions();
                            for (MultipleChoiseOption o : options) {
                                MultipleChoiseOption m_option_copy = (MultipleChoiseOption)o._ebean_createCopy();
                                m_option_copy.setId(null);
                                multipleChoiceOptionCopies.add(m_option_copy);
                            }
                            ((MultipleChoiceQuestion)question_copy).setOptions(multipleChoiceOptionCopies);
                        }
                        break;
                    }
                examQuestionCopies.add(question_copy);
            }
            examsec_copy.setQuestions(examQuestionCopies);
            examSectionsCopies.add(examsec_copy);
        }

        clone.setExamSections(examSectionsCopies);

        clone.generateHash();
        clone.setState("STUDENT_STARTED");
        clone.generateHash();

        return clone;
    }

    public List<ExamSection> createNewExamSectionList() {
        List<ExamSection> examSectionsCopies = new ArrayList<ExamSection>();
        return examSectionsCopies;
    }

    public List<AbstractQuestion> createNewExamQuestionList() {
        List<AbstractQuestion> examQuestionCopies = new ArrayList<AbstractQuestion>();
        return examQuestionCopies;
    }

    public List<MultipleChoiseOption> createNewMultipleChoiceOptionList() {
        List<MultipleChoiseOption> multipleChoiceOptionCopies = new ArrayList<MultipleChoiseOption>();
        return multipleChoiceOptionCopies;
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
