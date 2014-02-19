package models;

import java.util.List;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;

@Entity
public class MultipleChoiseQuestion extends SitnetModel implements QuestionInterface {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;
	
    
    private String question;
    
    @OneToMany(cascade = CascadeType.ALL)
    private List<MultipleChoiseOption> options;
    
    private boolean shared = false;
    
    private Double totalScore;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}


	public String getQuestion() {
		return question;
	}

	public void setQuestion(String question) {
		this.question = question;
	}

	public List<MultipleChoiseOption> getOptions() {
		return options;
	}

	public void setOptions(List<MultipleChoiseOption> options) {
		this.options = options;
	}

	public boolean isShared() {
		return shared;
	}

	public void setShared(boolean shared) {
		this.shared = shared;
	}

	public Double getTotalScore() {
		return totalScore;
	}

	public void setTotalScore(Double totalScore) {
		this.totalScore = totalScore;
	}

    
}
