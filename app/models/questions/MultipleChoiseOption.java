package models.questions;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.GeneratedIdentityModel;
import org.springframework.beans.BeanUtils;

import javax.persistence.Entity;
import javax.persistence.ManyToOne;


@Entity
public class MultipleChoiseOption extends GeneratedIdentityModel implements Comparable<MultipleChoiseOption> {

    private String option;

    private boolean correctOption;

    private Double score;

    @ManyToOne
    @JsonBackReference
    private MultipleChoiceQuestion question;

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

    public MultipleChoiceQuestion getQuestion() {
        return question;
    }

    public void setQuestion(MultipleChoiceQuestion question) {
        this.question = question;
    }

    public MultipleChoiseOption copy() {
        MultipleChoiseOption option = new MultipleChoiseOption();
        BeanUtils.copyProperties(this, option, "id");
        return option;
    }

    public String toString() {
        return "MultipleChoiseOption{" +
                "id=" + getId() +
                ", option='" + option + '\'' +
                ", correctOption=" + correctOption +
                ", score=" + score +
                '}';
    }

    @Override
    public int compareTo(MultipleChoiseOption o) {
        if (getId() < o.getId()) {
            return -1;
        }
        return getId().equals(o.getId()) ? 0 : 1;
    }
}
