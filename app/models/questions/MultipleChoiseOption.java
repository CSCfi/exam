package models.questions;

import com.fasterxml.jackson.annotation.JsonBackReference;
import play.db.ebean.Model;
import util.SitnetUtil;

import javax.persistence.*;
import java.sql.Timestamp;

@Entity
public class MultipleChoiseOption extends Model {

    @Version
    @Temporal(TemporalType.TIMESTAMP)
    protected Timestamp ebeanTimestamp;

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

	private String option;
    
    private boolean correctOption = false;

    private Double score;

    @ManyToOne
    @JsonBackReference
    private MultipleChoiceQuestion question;

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

    public MultipleChoiceQuestion getQuestion() {
        return question;
    }

    public void setQuestion(MultipleChoiceQuestion question) {
        this.question = question;
    }

	@Override
    public Object clone() {

        return SitnetUtil.getClone(this);
    }

    public String toString() {
        return "MultipleChoiseOption{" +
                "id=" + id +
                ", option='" + option + '\'' +
                ", correctOption=" + correctOption +
                ", score=" + score +
                '}';
    }
}
