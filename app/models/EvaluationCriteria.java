package models;

import javax.persistence.Column;
import javax.persistence.Entity;

@Entity
public class EvaluationCriteria extends SitnetModel {

//	@ManyToOne(cascade = CascadeType.PERSIST)
//	@ManyToOne
//    @JoinColumn(name="question", referencedColumnName="id")
//	private AbstractQuestion question;
	
	@Column(length=512)
	private String criteria;

	public String getCriteria() {
		return criteria;
	}

	public void setCriteria(String criteria) {
		this.criteria = criteria;
	}

}
