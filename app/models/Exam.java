package models;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import models.questions.AbstractQuestion;
import models.questions.MultipleChoiseOption;
import models.questions.MultipleChoiseQuestion;
import org.apache.commons.codec.digest.DigestUtils;

import javax.persistence.*;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

/*
 * HUOM tämä luokka ei ole Tentin toteutus, vaan tentin tietomalli
 * 
 * Kuvaa Sitnettiin tallennettavan tentin rakenteen
 * 
 */
@Entity

public class Exam extends SitnetModel {

    // Tentti liittyy Opintojaksoon
    @ManyToOne
    private Course course;

    // onko tentillä joku toinen nimi, Opintojakson nimen lisäksi
    private String name;

    private ExamType examType;

    // Opettajan antama ohje Opiskelijalle tentin suorittamista varten
    private String instruction;

    private boolean shared;

    // An ExamSection may be used only in one Exam
    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "exam")
    @JsonManagedReference
    private List<ExamSection> examSections;

    @OneToOne
    private ExamEvent examEvent;

    @Column(length = 32, unique = true)
    private String hash;

    private Timestamp answeringStarted;

    private Timestamp answeringEnded;

    private String state;

    public Timestamp getAnsweringStarted() {
        return answeringStarted;
    }

    public void setAnsweringStarted(Timestamp answeringStarted) {
        this.answeringStarted = answeringStarted;
    }

    public Timestamp getAnsweringEnded() {
        return answeringEnded;
    }

    public void setAnsweringEnded(Timestamp answeringEnded) {
        this.answeringEnded = answeringEnded;
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

    public ExamEvent getExamEvent() {
        return examEvent;
    }

    public void setExamEvent(ExamEvent examEvent) {
        this.examEvent = examEvent;
    }

    public String getHash() {
        return hash;
    }

    public String generateHash() {

        // TODO: what attributes make examEvent unique?
        // create unique hash for exam
        String attributes = name +
                course.getCode() +
                state;

//                examEvent.getStartTime().toString() +
//                examEvent.getEndTime().toString();

        this.hash = DigestUtils.md5Hex(attributes);
        play.Logger.debug("Exam hash: " + this.hash);
        return hash;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }


    public Exam clone() {
        Exam examClone = new Exam();

        examClone.setCreated(this.getCreated());
        examClone.setCreator(this.getCreator());
        examClone.setModified(this.getModified());
        examClone.setModifier(this.getModifier());
        examClone.setCourse(this.getCourse());
        examClone.setName(this.getName());
        examClone.setExamType(this.getExamType());
        examClone.setInstruction(this.getInstruction());
        examClone.setShared(this.isShared());


        try {
            examClone.setExamEvent((ExamEvent) this.examEvent.clone());
        } catch (CloneNotSupportedException e) {
            e.printStackTrace();
        }


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
                        case "MultipleChoiseQuestion": {
                            List<MultipleChoiseOption> multipleChoiceOptionCopies = createNewMultipleChoiceOptionList();


                            List<MultipleChoiseOption> options = ((MultipleChoiseQuestion) q).getOptions();
                            for (MultipleChoiseOption o : options) {
                                MultipleChoiseOption m_option_copy = (MultipleChoiseOption)o._ebean_createCopy();
                                m_option_copy.setId(null);
                                multipleChoiceOptionCopies.add(m_option_copy);
                            }
                            ((MultipleChoiseQuestion)question_copy).setOptions(multipleChoiceOptionCopies);
                        }
                        break;
                    }
                examQuestionCopies.add(question_copy);
            }
            examsec_copy.setQuestions(examQuestionCopies);
            examSectionsCopies.add(examsec_copy);
        }

        examClone.setExamSections(examSectionsCopies);

        examClone.setExamEvent(this.getExamEvent());
        examClone.generateHash();
        examClone.setState("STUDENT_STARTED");

        return examClone;
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

    @Override
    public String toString() {
        return "Exam{" +
                "course=" + course +
                ", name='" + name + '\'' +
                ", examType=" + examType +
                ", instruction='" + instruction + '\'' +
                ", shared=" + shared +
//                ", examSections=" + examSections +
                ", examEvent=" + examEvent +
                ", hash='" + hash + '\'' +
                ", state='" + state + '\'' +
                '}';
    }
}
