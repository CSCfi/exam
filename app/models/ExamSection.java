package models;

import java.util.List;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.OneToMany;


/*
 * Tenttiosio, joka voi sisältää useita kysymyksiä (Kysymystyyppejä)
 * ryhmitää tentin kysymykset.
 * 
 *  Tentti sisältää ainakin yhden osion. 
 * 
 */
//@Entity
public class ExamSection extends SitnetModel {

	
//	@OneToMany(cascade = CascadeType.ALL)
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
