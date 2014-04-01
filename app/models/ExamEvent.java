package models;

import java.sql.Timestamp;
import java.util.List;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToMany;
import javax.persistence.OneToOne;

import play.Logger;
import play.db.ebean.Model;
import util.SitnetUtil;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;


/*
 * Toteutunut tentti, Opetuksen toteutus
 * http://tietomalli.csc.fi/Opetuksen%20toteutus-kaavio.html
 * 
 * <Opetustapahtuman tyyppi> voi olla esim luento tai tentti.
 */
@Entity
public class ExamEvent extends Model implements Cloneable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

//    @OneToOne
//    @JsonBackReference
//    private Exam currentExam;

    @ManyToMany(cascade = CascadeType.PERSIST)
    private List<Exam> exams;

    // tentin voimassaoloaika, tentti on avoin opiskelijoille tästä lähtien
    private Timestamp examActiveStartDate;
    // tentin voimassaoloaika, tentti sulkeutuu
    private Timestamp examActiveEndDate;

    private String examReadableStartDate;
    private String examReadableEndDate;

    // Akvaario
    private String room;

    // tentin kesto
    private Double duration;

    // muut opettajat jotka on lisättty tentin tarkastajiksi
    // TODO: miten tarkastajat lisätään? per tentti, per kysymys ?
    @ManyToMany(cascade = CascadeType.PERSIST)
    private List<User> inspectors;

    @ManyToMany(cascade = CascadeType.PERSIST)
    private List<User> enrolledStudents;

    // Exam grading, e.g. 1-5
    private String grading;

    // Exam language
    private String language;

    // Exam answer language
    private String answerLanguage;

    // Exam material
    private String material;

    // TODO: öhm tentin ja tenttitapahtuman tila on 2 eri asiaa!
    /*
     * Tentin tila
     *
     * avoin (lähetetty opiskelijalle), peruttu, opiskelija täyttää tenttiä, täytetty, tarkastettavana, tarkastettu jne..}
     *
     */
    private String state;

    public String getRoom() {
        return room;
    }

    public void setRoom(String room) {
        this.room = room;
    }

    public Double getDuration() {
        return duration;
    }

    public void setDuration(Double duration) {
        this.duration = duration;
    }

    public List<User> getInspectors() {
        return inspectors;
    }

    public void setInspectors(List<User> inspectors) {
        this.inspectors = inspectors;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getExamReadableEndDate() {
        return examReadableEndDate;
    }

    public void setExamReadableEndDate(String examReadableEndDate) {
        this.examReadableEndDate = examReadableEndDate;
    }

    public String getExamReadableStartDate() {
        return examReadableStartDate;
    }

    public void setExamReadableStartDate(String examReadableStartDate) {
        this.examReadableStartDate = examReadableStartDate;
    }

    public List<User> getEnrolledStudents() {
        return enrolledStudents;
    }

    public void setEnrolledStudents(List<User> enrolledStudents) {
        this.enrolledStudents = enrolledStudents;
    }

    public String getGrading() {
        return grading;
    }

    public void setGrading(String grading) {
        this.grading = grading;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getAnswerLanguage() {
        return answerLanguage;
    }

    public void setAnswerLanguage(String answerLanguage) {
        this.answerLanguage = answerLanguage;
    }

    public String getMaterial() {
        return material;
    }

    public void setMaterial(String material) {
        this.material = material;
    }

    public List<Exam> getExams() {
        return exams;
    }

    public void setExams(List<Exam> exams) {
        this.exams = exams;
    }

//    public Exam getCurrentExam() {
//		return currentExam;
//	}
//
//	public void setCurrentExam(Exam currentExam) {
//		this.currentExam = currentExam;
//	}

	@Override
    protected Object clone() throws CloneNotSupportedException {

        ExamEvent copy = (ExamEvent)SitnetUtil.getClone(this);

        Logger.debug("clone: "+ copy);

        return copy;
    }

    @Override
    public String toString() {
        return "ExamEvent{" +
                "id=" + id +
                ", examActiveStartDate=" + examActiveStartDate +
                ", examActiveEndDate=" + examActiveEndDate +
                ", examReadableStartDate=" + examReadableStartDate +
                ", examReadableEndDate=" + examReadableEndDate +
                ", room=" + room +
                ", duration=" + duration +
                ", inspectors=" + inspectors +
                ", enrolledStudents=" + enrolledStudents +
                ", grading=" + grading +
                ", language=" + language +
                ", answerLanguage=" + answerLanguage +
                ", material=" + material +
                ", state='" + state + '\'' +
                '}';
    }
}
