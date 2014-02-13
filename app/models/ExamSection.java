package models;

import java.util.List;


/*
 * Tenttiosio, joka voi sisältää useita kysymyksiä (Kysymystyyppejä)
 * ryhmitää tentin kysymykset.
 * 
 *  Tentti sisältää ainakin yhden osion. 
 * 
 */
public class ExamSection extends SitnetModel {

	
	private List<Question> questions;

	// osion kokonaispisteet
	private Long totalScore;
	
	
	
	
	
	public ExamSection(User creator) {
		super(creator);
	}





	public Long getTotalScore() {
		
		// TODO: laske tässä montako pistettä kaikista kysymyksistä muodostuu
		
		return totalScore;
	}
	
	
	
}
