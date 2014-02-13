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
	private List<User> inspectors;
	
	
	
	
	public ExamEven(User creator) {
		super(creator);
	}
	
}
