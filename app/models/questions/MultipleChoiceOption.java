package models.questions;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.GeneratedIdentityModel;
import org.springframework.beans.BeanUtils;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;


@Entity
public class MultipleChoiceOption extends GeneratedIdentityModel implements Comparable<MultipleChoiceOption> {

    private String option;

    private boolean correctOption;

    private Double score;

    @ManyToOne
    @JsonBackReference
    private Question question;

    @ManyToOne
    @JsonBackReference
    private Answer answer;

    public String getOption() {
        return option;
    }

    public void setOption(String option) {
        this.option = option;
    }

    public boolean isCorrectOption() {
        return correctOption;
    }

    public Answer getAnswer() {
        return answer;
    }

    public void setAnswer(Answer answer) {
        this.answer = answer;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }

        MultipleChoiceOption that = (MultipleChoiceOption) o;
        return getId().equals(that.getId());
    }

    @Override
    public int hashCode() {
        int result = super.hashCode();
        if (getId() != null) {
            result = 31 * result + getId().hashCode();
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

    public Question getQuestion() {
        return question;
    }

    public void setQuestion(Question question) {
        this.question = question;
    }

    public MultipleChoiceOption copy() {
        MultipleChoiceOption option = new MultipleChoiceOption();
        BeanUtils.copyProperties(this, option, "id");
        return option;
    }

    public String toString() {
        return "MultipleChoiceOption{" +
                "id=" + getId() +
                ", option='" + option + '\'' +
                ", correctOption=" + correctOption +
                ", score=" + score +
                '}';
    }

    @Override
    public int compareTo(MultipleChoiceOption o) {
        if (getId() < o.getId()) {
            return -1;
        }
        return getId().equals(o.getId()) ? 0 : 1;
    }
}
