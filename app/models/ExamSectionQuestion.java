package models;

import com.fasterxml.jackson.annotation.JsonBackReference;
import models.api.Scorable;
import models.api.Sortable;
import models.base.OwnedModel;
import models.questions.EssayAnswer;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;

import javax.annotation.Nonnull;
import javax.persistence.*;
import java.util.Set;

@Entity
public class ExamSectionQuestion extends OwnedModel implements Comparable<ExamSectionQuestion>, Sortable, Scorable {

    @ManyToOne
    @JoinColumn(name = "exam_section_id")
    @JsonBackReference
    private ExamSection examSection;

    @ManyToOne
    @JoinColumn(name = "question_id")
    private Question question;

    @OneToMany(cascade=CascadeType.ALL, mappedBy = "examSectionQuestion")
    private Set<ExamSectionQuestionOption> options;

    @Column
    private int sequenceNumber;

    @Column
    private String answerInstructions;

    @Column
    private Integer maxScore;

    @Column
    private Question.EvaluationType evaluationType;

    @OneToOne(cascade = CascadeType.ALL)
    private EssayAnswer essayAnswer;

    @Column
    private String evaluationCriteria;

    @Column
    private Integer expectedWordCount;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ExamSection getExamSection() {
        return examSection;
    }

    public void setExamSection(ExamSection examSection) {
        this.examSection = examSection;
    }

    public Question getQuestion() {
        return question;
    }

    public void setQuestion(Question question) {
        this.question = question;
    }

    public Set<ExamSectionQuestionOption> getOptions() {
        return options;
    }

    public void setOptions(Set<ExamSectionQuestionOption> options) {
        this.options = options;
    }

    public int getSequenceNumber() {
        return sequenceNumber;
    }

    public void setSequenceNumber(int sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }

    public Integer getMaxScore() {
        return maxScore;
    }

    public void setMaxScore(Integer maxScore) {
        this.maxScore = maxScore;
    }

    public String getAnswerInstructions() {
        return answerInstructions;
    }

    public void setAnswerInstructions(String answerInstructions) {
        this.answerInstructions = answerInstructions;
    }

    public Question.EvaluationType getEvaluationType() {
        return evaluationType;
    }

    public void setEvaluationType(Question.EvaluationType evaluationType) {
        this.evaluationType = evaluationType;
    }

    public EssayAnswer getEssayAnswer() {
        return essayAnswer;
    }

    public void setEssayAnswer(EssayAnswer essayAnswer) {
        this.essayAnswer = essayAnswer;
    }

    public String getEvaluationCriteria() {
        return evaluationCriteria;
    }

    public void setEvaluationCriteria(String evaluationCriteria) {
        this.evaluationCriteria = evaluationCriteria;
    }

    public Integer getExpectedWordCount() {
        return expectedWordCount;
    }

    public void setExpectedWordCount(Integer expectedWordCount) {
        this.expectedWordCount = expectedWordCount;
    }

    ExamSectionQuestion copy(boolean usePrototypeQuestion) {
        ExamSectionQuestion esq = new ExamSectionQuestion();
        BeanUtils.copyProperties(this, esq, "id");
        Question blueprint = question.copy();
        if (usePrototypeQuestion) {
            blueprint.setParent(question.getParent());
        }
        esq.setQuestion(blueprint);
        for (MultipleChoiceOption o : blueprint.getOptions()) {
            ExamSectionQuestionOption esqo = new ExamSectionQuestionOption();
            esqo.setOption(o);
            esq.getOptions().add(esqo);
        }
        return esq;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof ExamSectionQuestion)) {
            return false;
        }
        ExamSectionQuestion other = (ExamSectionQuestion) o;
        return new EqualsBuilder().append(getExamSection(), other.getExamSection())
                .append(getQuestion(), other.getQuestion()).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(getExamSection()).append(getQuestion()).build();
    }

    @Override
    public int compareTo(@Nonnull ExamSectionQuestion o) {
        return sequenceNumber - o.sequenceNumber;
    }

    @Override
    public Integer getOrdinal() {
        return sequenceNumber;
    }

    @Override
    public void setOrdinal(Integer ordinal) {
        sequenceNumber = ordinal;
    }

    @Transient
    @Override
    public String getValidationResult() {
        return question.getValidationResult();
    }

    @Transient
    @Override
    public Double getAssessedScore() {
        switch (question.getType()) {
            case EssayQuestion:
                if (evaluationType == Question.EvaluationType.Points) {
                    return essayAnswer == null || essayAnswer.getEvaluatedScore() == null ? 0 :
                            essayAnswer.getEvaluatedScore().doubleValue();
                }
                break;
            case MultipleChoiceQuestion:
                return options.stream()
                        .filter(ExamSectionQuestionOption::isAnswered)
                        .map(ExamSectionQuestionOption::getScore)
                        .findFirst()
                        .orElse(0.0);
            case WeightedMultipleChoiceQuestion:
                Double evaluation = options.stream()
                        .filter(ExamSectionQuestionOption::isAnswered)
                        .map(ExamSectionQuestionOption::getScore)
                        .reduce(0.0, (sum, x) -> sum += x);
                // ATM minimum score is zero
                return Math.max(0.0, evaluation);

        }
        return 0.0;
    }

    @Transient
    @Override
    public Double getMaxAssessedScore() {
        switch (question.getType()) {
            case EssayQuestion:
                if (evaluationType == Question.EvaluationType.Points) {
                    return maxScore == null ? 0 : maxScore.doubleValue();
                }
                break;
            case MultipleChoiceQuestion:
                return maxScore == null ? 0 : maxScore.doubleValue();
            case WeightedMultipleChoiceQuestion:
                return options.stream()
                        .map(ExamSectionQuestionOption::getScore)
                        .filter(o -> o > 0)
                        .reduce(0.0, (sum, x) -> sum += x);
        }
        return 0.0;
    }

    @Transient
    @Override
    public boolean isRejected() {
        return question.getType() == Question.Type.EssayQuestion &&
                evaluationType == Question.EvaluationType.Selection &&
                essayAnswer != null && essayAnswer.getEvaluatedScore() != null &&
                essayAnswer.getEvaluatedScore() == 0;
    }

    @Transient
    @Override
    public boolean isApproved() {
        return question.getType() == Question.Type.EssayQuestion &&
                evaluationType == Question.EvaluationType.Selection &&
                essayAnswer != null && essayAnswer.getEvaluatedScore() != null &&
                essayAnswer.getEvaluatedScore() == 1;
    }

}
