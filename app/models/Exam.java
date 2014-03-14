package models;

import java.util.List;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;

import org.apache.commons.codec.digest.DigestUtils;

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

    @OneToMany(cascade = CascadeType.PERSIST, mappedBy = "exam")

    private List<ExamSection> examSections;

    @OneToOne
    private ExamEvent examEvent;

    @Column(length = 32)
    private String hash;

    private String state;

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
                course.getCode();

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

    @Override
    public String toString() {
        return "Exam{" +
                "course=" + course +
                ", name='" + name + '\'' +
                ", examType=" + examType +
                ", instruction='" + instruction + '\'' +
                ", shared=" + shared +
                ", examSections=" + examSections +
                ", examEvent=" + examEvent +
                ", hash='" + hash + '\'' +
                ", state='" + state + '\'' +
                '}';
    }
}
