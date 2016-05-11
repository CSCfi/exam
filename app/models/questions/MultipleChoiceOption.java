package models.questions;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.ExamSectionQuestionOption;
import models.base.GeneratedIdentityModel;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.BeanUtils;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import java.util.Set;


@Entity
public class MultipleChoiceOption extends GeneratedIdentityModel implements Comparable<MultipleChoiceOption> {

    private String option;

    private boolean correctOption;

    private Double defaultScore;

    @ManyToOne
    @JsonBackReference
    private Question question;

    @OneToMany(cascade = CascadeType.REMOVE, mappedBy = "option")
    @JsonBackReference
    private Set<ExamSectionQuestionOption> examSectionQuestionOptions;

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

    public Double getDefaultScore() {
        return defaultScore;
    }

    public void setDefaultScore(Double defaultScore) {
        this.defaultScore = defaultScore;
    }

    public Question getQuestion() {
        return question;
    }

    public void setQuestion(Question question) {
        this.question = question;
    }

    public Set<ExamSectionQuestionOption> getExamSectionQuestionOptions() {
        return examSectionQuestionOptions;
    }

    public void setExamSectionQuestionOptions(Set<ExamSectionQuestionOption> examSectionQuestionOptions) {
        this.examSectionQuestionOptions = examSectionQuestionOptions;
    }

    public MultipleChoiceOption copy() {
        MultipleChoiceOption option = new MultipleChoiceOption();
        BeanUtils.copyProperties(this, option, "id", "examSectionQuestionOptions");
        return option;
    }

    public String toString() {
        return "MultipleChoiceOption{" +
                "id=" + getId() +
                ", option='" + option + '\'' +
                ", correctOption=" + correctOption +
                '}';
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
    @Override
    public int compareTo(@NotNull MultipleChoiceOption o) {
        if (getId() < o.getId()) {
            return -1;
        }
        return getId().equals(o.getId()) ? 0 : 1;
    }
}
