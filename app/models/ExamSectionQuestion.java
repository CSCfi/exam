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
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OneToOne;
import javax.persistence.Transient;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
public class ExamSectionQuestion extends OwnedModel implements Comparable<ExamSectionQuestion>, Sortable, Scorable {

    @ManyToOne
    @JoinColumn(name = "exam_section_id")
    @JsonBackReference
    private ExamSection examSection;

    @ManyToOne(cascade = CascadeType.PERSIST)
    @JoinColumn(name = "question_id")
    private Question question;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "examSectionQuestion")
    private Set<ExamSectionQuestionOption> options;

    @Column
    private int sequenceNumber;

    @Column
    private String answerInstructions;

    @Column
    private Integer maxScore;

    @Transient
    private Double derivedMaxScore;

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

    public Double getDerivedMaxScore() {
        return derivedMaxScore;
    }

    public void setDerivedMaxScore() {
        this.derivedMaxScore = getMaxAssessedScore();
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

    ExamSectionQuestion copy(boolean preserveOriginalQuestion) {
        ExamSectionQuestion esq = new ExamSectionQuestion();
        BeanUtils.copyProperties(this, esq, "id", "options");
        Question blueprint;
        if (!preserveOriginalQuestion) {
            blueprint = question.copy();
            blueprint.setParent(question);
            blueprint.save();
        } else {
            blueprint = question;
        }
        esq.setQuestion(blueprint);
        for (ExamSectionQuestionOption o : options) {
            esq.getOptions().add(o.copy());
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
        return new EqualsBuilder().append(examSection, other.examSection)
                .append(question, other.question).build();
    }

    @Override
    public int hashCode() {
        return new HashCodeBuilder().append(examSection).append(question).build();
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
                Optional<ExamSectionQuestionOption> o = options.stream()
                        .filter(ExamSectionQuestionOption::isAnswered).findFirst();
                if (o.isPresent()) {
                    return o.get().getOption().isCorrectOption() ? maxScore : 0.0;
                }
                break;
            case WeightedMultipleChoiceQuestion:
                Double evaluation = options.stream()
                        .filter(esq -> esq.isAnswered() && esq.getScore() != null)
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
                        .filter(score -> score != null && score > 0)
                        .reduce(0.0, (sum, x) -> sum += x);
        }
        return 0.0;
    }

    @Transient
    public Double getMinScore() {
        if (question.getType() == Question.Type.WeightedMultipleChoiceQuestion) {
            return options.stream()
                    .map(ExamSectionQuestionOption::getScore)
                    .filter(score -> score != null && score < 0)
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

    /**
     * Adds new answer option.
     * If question type equals WeightedMultiChoiceQuestion, recalculates scores for old options so that max assessed score won't change.
     *
     * @param option         New option to add.
     * @param preserveScores If true other options scores will not be recalculated.
     */
    @Transient
    public void addOption(ExamSectionQuestionOption option, boolean preserveScores) {
        if (question.getType() != Question.Type.WeightedMultipleChoiceQuestion
                || option.getScore() == null || preserveScores) {
            options.add(option);
            return;
        }

        if (option.getScore() > 0) {
            List<ExamSectionQuestionOption> opts = options.stream().filter(o -> o.getScore() > 0)
                    .collect(Collectors.toList());
            BigDecimal delta = calculateOptionScores(option.getScore(), opts);
            option.setScore(new BigDecimal(option.getScore()).add(delta).doubleValue());
        } else if (option.getScore() < 0) {
            List<ExamSectionQuestionOption> opts = options.stream().filter(o -> o.getScore() < 0)
                    .collect(Collectors.toList());
            BigDecimal delta = calculateOptionScores(option.getScore(), opts);
            option.setScore(new BigDecimal(option.getScore()).add(delta).doubleValue());
        }
        options.add(option);
    }

    @Transient
    public void removeOption(MultipleChoiceOption option, boolean preserveScores) {
        ExamSectionQuestionOption esqo = options.stream()
                .filter(o -> option.equals(o.getOption()))
                .findFirst()
                .orElse(null);
        if (esqo == null) {
            return;
        }

        Double score = esqo.getScore();
        options.remove(esqo);
        if (question.getType() != Question.Type.WeightedMultipleChoiceQuestion
                || score == null || preserveScores) {
            return;
        }

        if (score > 0) {
            List<ExamSectionQuestionOption> opts = options.stream().filter(o -> o.getScore() > 0)
                    .collect(Collectors.toList());
            BigDecimal delta = calculateOptionScores(score*-1, opts);
            if (opts.size() > 0) {
                ExamSectionQuestionOption first = opts.get(0);
                first.setScore(new BigDecimal(first.getScore()).add(delta).doubleValue());
            }
        } else if (score < 0) {
            List<ExamSectionQuestionOption> opts = options.stream().filter(o -> o.getScore() < 0)
                    .collect(Collectors.toList());
            BigDecimal delta = calculateOptionScores(score*-1, opts);
            if (opts.size() > 0) {
                ExamSectionQuestionOption first = opts.get(0);
                first.setScore(new BigDecimal(first.getScore()).add(delta).doubleValue());
            }
        }
    }

    private BigDecimal calculateOptionScores(double optionScore, List<ExamSectionQuestionOption> opts) {
        BigDecimal oldSum = new BigDecimal(0);
        BigDecimal sum = new BigDecimal(0);
        for (ExamSectionQuestionOption o : opts) {
            oldSum = oldSum.add(BigDecimal.valueOf(o.getScore()));
            o.setScore(roundToTwoDigits(o.getScore() - optionScore / opts.size()));
            sum = sum.add(BigDecimal.valueOf(o.getScore()));
        }
        return oldSum.subtract(new BigDecimal(optionScore).add(sum));
    }

    private Double roundToTwoDigits(double score) {
        return Math.round(score * 100) / 100d;
    }
}
