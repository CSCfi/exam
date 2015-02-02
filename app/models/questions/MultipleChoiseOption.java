package models.questions;

import com.fasterxml.jackson.annotation.JsonBackReference;
import org.springframework.beans.BeanUtils;
import play.db.ebean.Model;

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
    
    private boolean correctOption;

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

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }

        MultipleChoiseOption that = (MultipleChoiseOption) o;
        return id.equals(that.id);
    }

    @Override
    public int hashCode() {
        int result = super.hashCode();
        if (id != null) {
            result = 31 * result + id.hashCode();
        }
        return result;
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

	public MultipleChoiseOption copy() {
        MultipleChoiseOption option = new MultipleChoiseOption();
        BeanUtils.copyProperties(this, option , new String[] {"id"});
        return option;
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
