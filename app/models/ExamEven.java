package models;

import java.util.List;


/*
 * Toteutunut tentti, Opetuksen toteutus
 * http://tietomalli.csc.fi/Opetuksen%20toteutus-kaavio.html
 * 
 * <Opetustapahtuman tyyppi> voi olla esim luento tai tentti.
 */
public class ExamEven extends SitnetModel {

	
	private Exam exam;
	
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
	
	
	public ExamEven(User creator) {
		super(creator);
	}
	
}
