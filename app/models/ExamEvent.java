package models;

import play.db.ebean.Model;

import javax.persistence.*;
import java.util.List;


/*
 * Toteutunut tentti, Opetuksen toteutus
 * http://tietomalli.csc.fi/Opetuksen%20toteutus-kaavio.html
 * 
 * <Opetustapahtuman tyyppi> voi olla esim luento tai tentti.
 */
@Entity
public class ExamEvent extends Model {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

	// tentin kesto
	private Double duration;

	// muut opettajat jotka on lisättty tentin tarkastajiksi
	// TODO: miten tarkastajat lisätään? per tentti, per kysymys ?
	private List<User> inspectors;
	
	
	// TODO: öhm tentin ja tenttitapahtuman tila on 2 eri asiaa!
	
	/* 
	 * Tentin tila
	 *  
	 * avoin (lähetetty opiskelijalle), peruttu, opiskelija täyttää tenttiä, täytetty, tarkastettavana, tarkastettu jne..}  
	 * 
	 */
	private String state;

    /*public Exam getExam() {
        return exam;
    }

    public void setExam(Exam exam) {
        this.exam = exam;
    }*/

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
}
