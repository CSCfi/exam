package models.questions;

import models.SitnetModel;

import javax.persistence.Entity;

@Entity
public class MultipleChoiseOption extends SitnetModel {

//    @Id
//    @GeneratedValue(strategy = GenerationType.AUTO)
//    private Long id;
	

	private String option;
    
    private boolean correctOption = false;
    
    private Double score;

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public String getOption() {
		return option;
	}

	public void setOption(String option) {
		this.option = option;
	}

	public boolean isCorrectOption() {
		return correctOption;
	}

	public void setCorrectOption(boolean correctOption) {
		this.correctOption = correctOption;
	}

	public Double getScore() {
		return score;
	}

	public void setScore(Double score) {
		this.score = score;
	}

    @Override
    public String toString() {
        return "MultipleChoiseOption{" +
                "id=" + id +
                ", option='" + option + '\'' +
                ", correctOption=" + correctOption +
                ", score=" + score +
                '}';
    }
}
