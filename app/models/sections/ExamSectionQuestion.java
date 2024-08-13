// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.sections;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Transient;
import java.math.BigDecimal;
import java.math.MathContext;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import javax.annotation.Nonnull;
import models.base.OwnedModel;
import models.questions.ClozeTestAnswer;
import models.questions.EssayAnswer;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeanUtils;
import play.mvc.Result;

@Entity
public class ExamSectionQuestion extends OwnedModel implements Comparable<ExamSectionQuestion>, Sortable, Scorable {

    private final Logger logger = LoggerFactory.getLogger(ExamSectionQuestion.class);

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
    private Double maxScore;

    @Column
    private Double forcedScore;

    @Transient
    private Double derivedMaxScore;

    @Transient
    private Double derivedAssessedScore;

    @Transient
    private Double derivedMinScore;

    @Column
    private Question.EvaluationType evaluationType;

    @OneToOne(cascade = CascadeType.ALL)
    private EssayAnswer essayAnswer;

    @OneToOne(cascade = CascadeType.ALL)
    private ClozeTestAnswer clozeTestAnswer;

    @Column
    private String evaluationCriteria;

    @Column
    private Integer expectedWordCount;

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

    public Double getMaxScore() {
        return maxScore;
    }

    public void setMaxScore(Double maxScore) {
        this.maxScore = maxScore;
    }

    public Double getForcedScore() {
        return forcedScore;
    }

    public void setForcedScore(Double forcedScore) {
        this.forcedScore = forcedScore;
    }

    public Double getDerivedMaxScore() {
        return derivedMaxScore;
    }

    public void setDerivedMaxScore() {
        this.derivedMaxScore = getMaxAssessedScore();
    }

    public void setDerivedAssessedScore() {
        this.derivedAssessedScore = getAssessedScore();
    }

    public Double getDerivedMinScore() {
        return derivedMinScore;
    }

    public void setDerivedMinScore() {
        this.derivedMinScore = getMinScore();
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

    public ClozeTestAnswer getClozeTestAnswer() {
        return clozeTestAnswer;
    }

    public void setClozeTestAnswer(ClozeTestAnswer clozeTestAnswer) {
        this.clozeTestAnswer = clozeTestAnswer;
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

    ExamSectionQuestion copyWithAnswers(Boolean hasParent) {
        ExamSectionQuestion esqCopy = new ExamSectionQuestion();
        BeanUtils.copyProperties(this, esqCopy, "id", "options", "essayAnswer", "clozeTestAnswer");
        // This is a little bit tricky. Need to map the original question options with copied ones, so they can be
        // associated with both question and exam section question options :)

        Map<Long, MultipleChoiceOption> optionMap;

        if (question.getType() == Question.Type.ClaimChoiceQuestion) {
            optionMap = new TreeMap<>();
        } else {
            optionMap = new HashMap<>();
        }

        Question blueprint = question.copy(optionMap, hasParent);
        if (hasParent) {
            blueprint.setParent(question);
        }
        blueprint.save();
        options.forEach(option -> {
            Optional<MultipleChoiceOption> parentOption = Optional.ofNullable(option.getOption()).filter(
                opt -> opt.getId() != null
            );
            if (parentOption.isPresent()) {
                MultipleChoiceOption optionCopy = optionMap.get(parentOption.get().getId());
                optionCopy.setQuestion(blueprint);
                optionCopy.save();
                ExamSectionQuestionOption esqoCopy = option.copyWithAnswer();
                esqoCopy.setOption(optionCopy);
                esqCopy.getOptions().add(esqoCopy);
            } else {
                logger.error("Failed to copy a multi-choice question option!");
                throw new RuntimeException();
            }
        });

        esqCopy.setQuestion(blueprint);
        // Essay Answer
        if (essayAnswer != null) {
            esqCopy.setEssayAnswer(essayAnswer.copy());
        }
        if (clozeTestAnswer != null) {
            esqCopy.setClozeTestAnswer(clozeTestAnswer.copy());
        }
        return esqCopy;
    }

    ExamSectionQuestion copy(boolean preserveOriginalQuestion, boolean setParent) {
        ExamSectionQuestion esqCopy = new ExamSectionQuestion();
        BeanUtils.copyProperties(this, esqCopy, "id", "options", "creator", "modifier");
        Question blueprint;
        if (preserveOriginalQuestion) {
            // Use the existing question references, no copying
            blueprint = question;
            options.forEach(o -> esqCopy.getOptions().add(o.copy()));
        } else {
            // This is a little bit tricky. Need to map the original question options with copied ones, so they can be
            // associated with both question and exam section question options :)
            Map<Long, MultipleChoiceOption> optionMap;

            if (question.getType() == Question.Type.ClaimChoiceQuestion) {
                optionMap = new TreeMap<>();
            } else {
                optionMap = new HashMap<>();
            }

            blueprint = question.copy(optionMap, setParent);
            if (setParent) {
                blueprint.setParent(question);
            }
            blueprint.save();
            optionMap.forEach((k, optionCopy) -> {
                optionCopy.setQuestion(blueprint);
                optionCopy.save();
                options
                    .stream()
                    .filter(o -> o.getOption().getId().equals(k))
                    .findFirst()
                    .ifPresentOrElse(
                        esqo -> {
                            ExamSectionQuestionOption esqoCopy = esqo.copy();
                            esqoCopy.setOption(optionCopy);
                            esqCopy.getOptions().add(esqoCopy);
                        },
                        () -> {
                            logger.error("Failed to copy a multi-choice question option!");
                            throw new RuntimeException();
                        }
                    );
            });
        }
        esqCopy.setQuestion(blueprint);
        return esqCopy;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof ExamSectionQuestion other)) {
            return false;
        }
        return new EqualsBuilder().append(examSection, other.examSection).append(question, other.question).build();
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

    @Override
    public Optional<Result> getValidationResult(JsonNode node) {
        return question.getValidationResult(node);
    }

    @Override
    public Double getAssessedScore() {
        switch (question.getType()) {
            case EssayQuestion -> {
                if (evaluationType == Question.EvaluationType.Points) {
                    return essayAnswer == null || essayAnswer.getEvaluatedScore() == null
                        ? 0
                        : essayAnswer.getEvaluatedScore();
                }
            }
            case MultipleChoiceQuestion -> {
                if (forcedScore != null) {
                    return forcedScore;
                }
                Optional<ExamSectionQuestionOption> o = options
                    .stream()
                    .filter(ExamSectionQuestionOption::isAnswered)
                    .findFirst();
                if (o.isPresent()) {
                    return o.get().getOption().isCorrectOption() ? maxScore : 0.0;
                }
            }
            case WeightedMultipleChoiceQuestion -> {
                if (forcedScore != null) {
                    return forcedScore;
                }
                Double evaluation = options
                    .stream()
                    .filter(esq -> esq.isAnswered() && esq.getScore() != null)
                    .map(ExamSectionQuestionOption::getScore)
                    .reduce(0.0, Double::sum);
                // ATM minimum score is zero
                return Math.max(0.0, evaluation);
            }
            case ClozeTestQuestion -> {
                if (forcedScore != null) {
                    return forcedScore;
                }
                // sanity check
                if (clozeTestAnswer == null) {
                    return 0.0;
                }
                ClozeTestAnswer.Score score = clozeTestAnswer.calculateScore(this);
                int correct = score.getCorrectAnswers();
                int incorrect = score.getIncorrectAnswers();
                if (correct + incorrect == 0) {
                    return 0.0;
                }
                DecimalFormat df = new DecimalFormat("#.##", new DecimalFormatSymbols(Locale.US));
                double value = (correct * maxScore) / (correct + incorrect);
                return Double.valueOf(df.format(value));
            }
            case ClaimChoiceQuestion -> {
                if (forcedScore != null) {
                    return forcedScore;
                }
                Optional<ExamSectionQuestionOption> answeredOption = options
                    .stream()
                    .filter(ExamSectionQuestionOption::isAnswered)
                    .findFirst();
                if (answeredOption.isPresent()) {
                    return answeredOption.get().getScore();
                }
                return 0.0;
            }
        }
        return 0.0;
    }

    @Override
    public Double getMaxAssessedScore() {
        switch (question.getType()) {
            case EssayQuestion -> {
                if (evaluationType == Question.EvaluationType.Points) {
                    return maxScore == null ? 0 : maxScore;
                }
            }
            case MultipleChoiceQuestion, ClozeTestQuestion -> {
                return maxScore == null ? 0 : maxScore;
            }
            case WeightedMultipleChoiceQuestion -> {
                return options
                    .stream()
                    .map(ExamSectionQuestionOption::getScore)
                    .filter(score -> score != null && score > 0)
                    .reduce(0.0, Double::sum);
            }
            case ClaimChoiceQuestion -> {
                return options
                    .stream()
                    .map(ExamSectionQuestionOption::getScore)
                    .filter(Objects::nonNull)
                    .max(Comparator.comparing(Double::valueOf))
                    .orElse(0.0);
            }
        }
        return 0.0;
    }

    public Double getMinScore() {
        if (question.getType() == Question.Type.WeightedMultipleChoiceQuestion) {
            return options
                .stream()
                .map(ExamSectionQuestionOption::getScore)
                .filter(score -> score != null && score < 0)
                .reduce(0.0, Double::sum);
        } else if (question.getType() == Question.Type.ClaimChoiceQuestion) {
            return options
                .stream()
                .map(ExamSectionQuestionOption::getScore)
                .filter(Objects::nonNull)
                .min(Comparator.comparing(Double::valueOf))
                .orElse(0.0);
        }
        return 0.0;
    }

    @Override
    public boolean isRejected() {
        return (
            question.getType() == Question.Type.EssayQuestion &&
            evaluationType == Question.EvaluationType.Selection &&
            essayAnswer != null &&
            essayAnswer.getEvaluatedScore() != null &&
            essayAnswer.getEvaluatedScore() == 0
        );
    }

    @Override
    public boolean isApproved() {
        return (
            question.getType() == Question.Type.EssayQuestion &&
            evaluationType == Question.EvaluationType.Selection &&
            essayAnswer != null &&
            essayAnswer.getEvaluatedScore() != null &&
            essayAnswer.getEvaluatedScore() == 1
        );
    }

    /**
     * Adds new answer option.
     * If question type equals WeightedMultiChoiceQuestion, recalculates scores for old options so that max assessed
     * score won't change.
     *
     * @param option New option to add.
     */
    public void addOption(ExamSectionQuestionOption option, boolean preserveScores) {
        if (question.getType() == Question.Type.ClaimChoiceQuestion) return;

        if (
            question.getType() != Question.Type.WeightedMultipleChoiceQuestion ||
            option.getScore() == null ||
            preserveScores
        ) {
            options.add(option);
            return;
        }

        if (option.getScore() > 0) {
            List<ExamSectionQuestionOption> opts = options
                .stream()
                .filter(o -> o.getScore() != null && o.getScore() > 0)
                .toList();
            BigDecimal delta = calculateOptionScores(option.getScore(), opts);
            option.setScore(BigDecimal.valueOf(option.getScore()).add(delta).doubleValue());
        } else if (option.getScore() < 0) {
            List<ExamSectionQuestionOption> opts = options
                .stream()
                .filter(o -> o.getScore() != null && o.getScore() < 0)
                .toList();
            BigDecimal delta = calculateOptionScores(option.getScore(), opts);
            option.setScore(BigDecimal.valueOf(option.getScore()).add(delta).doubleValue());
        }
        options.add(option);
    }

    private void initOptionScore(Double score, List<ExamSectionQuestionOption> options) {
        BigDecimal delta = calculateOptionScores(score * -1, options);
        if (!options.isEmpty()) {
            ExamSectionQuestionOption first = options.getFirst();
            first.setScore(BigDecimal.valueOf(first.getScore()).add(delta).doubleValue());
        }
    }

    public void removeOption(MultipleChoiceOption option, boolean preserveScores) {
        if (question.getType() == Question.Type.ClaimChoiceQuestion) return;

        ExamSectionQuestionOption esqo = options
            .stream()
            .filter(o -> option.equals(o.getOption()))
            .findFirst()
            .orElse(null);
        if (esqo == null) {
            return;
        }

        Double score = esqo.getScore();
        options.remove(esqo);
        if (question.getType() != Question.Type.WeightedMultipleChoiceQuestion || score == null || preserveScores) {
            return;
        }

        if (score > 0) {
            List<ExamSectionQuestionOption> opts = options
                .stream()
                .filter(o -> o.getScore() != null && o.getScore() > 0)
                .toList();
            initOptionScore(score, opts);
        } else if (score < 0) {
            List<ExamSectionQuestionOption> opts = options
                .stream()
                .filter(o -> o.getScore() != null && o.getScore() < 0)
                .toList();
            initOptionScore(score, opts);
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
        BigDecimal subtracted = oldSum.subtract(BigDecimal.valueOf(optionScore).add(sum));
        return subtracted.round(new MathContext(1));
    }

    private Double roundToTwoDigits(double score) {
        return Math.round(score * 100) / 100d;
    }
}
