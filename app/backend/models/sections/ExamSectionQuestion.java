/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.models.sections;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Nonnull;
import javax.persistence.*;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.databind.JsonNode;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.commons.lang3.builder.HashCodeBuilder;
import org.springframework.beans.BeanUtils;
import play.Logger;
import play.mvc.Result;

import backend.models.api.Scorable;
import backend.models.api.Sortable;
import backend.models.base.OwnedModel;
import backend.models.questions.ClozeTestAnswer;
import backend.models.questions.EssayAnswer;
import backend.models.questions.MultipleChoiceOption;
import backend.models.questions.Question;

@Entity
public class ExamSectionQuestion extends OwnedModel implements Comparable<ExamSectionQuestion>, Sortable, Scorable {

    private static final Logger.ALogger logger = Logger.of(ExamSectionQuestion.class);

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

    @Transient
    private Double derivedMaxScore;

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

    public Double getMaxScore() {
        return maxScore;
    }

    public void setMaxScore(Double maxScore) {
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

    ExamSectionQuestion copyWithAnswers() {
        ExamSectionQuestion esqCopy = new ExamSectionQuestion();
        BeanUtils.copyProperties(this, esqCopy, "id", "options", "essayAnswer", "clozeTestAnswer");
        // This is a little bit tricky. Need to map the original question options with copied ones so they can be
        // associated with both question and exam section question options :)
        Map<Long, MultipleChoiceOption> optionMap = new HashMap<>();
        Question blueprint = question.copy(optionMap, true);
        blueprint.setParent(question);
        blueprint.save();
        optionMap.forEach((k, optionCopy) -> {
            optionCopy.setQuestion(blueprint);
            optionCopy.save();
            Optional<ExamSectionQuestionOption> esqoo = options.stream()
                    .filter(o -> o.getOption().getId().equals(k))
                    .findFirst();
            if (esqoo.isPresent()) {
                ExamSectionQuestionOption esqo = esqoo.get();
                ExamSectionQuestionOption esqoCopy = esqo.copyWithAnswer();
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
            // This is a little bit tricky. Need to map the original question options with copied ones so they can be
            // associated with both question and exam section question options :)
            Map<Long, MultipleChoiceOption> optionMap = new HashMap<>();
            blueprint = question.copy(optionMap, setParent);
            if (setParent) {
                blueprint.setParent(question);
            }
            blueprint.save();
            optionMap.forEach((k, optionCopy) -> {
                optionCopy.setQuestion(blueprint);
                optionCopy.save();
                Optional<ExamSectionQuestionOption> esqoo = options.stream()
                        .filter(o -> o.getOption().getId().equals(k))
                        .findFirst();
                if (esqoo.isPresent()) {
                    ExamSectionQuestionOption esqo = esqoo.get();
                    ExamSectionQuestionOption esqoCopy = esqo.copy();
                    esqoCopy.setOption(optionCopy);
                    esqCopy.getOptions().add(esqoCopy);
                } else {
                    logger.error("Failed to copy a multi-choice question option!");
                    throw new RuntimeException();
                }
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
    public Optional<Result> getValidationResult(JsonNode node) {
        return question.getValidationResult(node);
    }

    @Transient
    @Override
    public Double getAssessedScore() {
        switch (question.getType()) {
            case EssayQuestion:
                if (evaluationType == Question.EvaluationType.Points) {
                    return essayAnswer == null || essayAnswer.getEvaluatedScore() == null ? 0 :
                            essayAnswer.getEvaluatedScore();
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
            case ClozeTestQuestion:
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
                DecimalFormat df = new DecimalFormat("#.##");
                return Double.valueOf(df.format(correct * maxScore / (correct + incorrect)));
        }
        return 0.0;
    }

    @Transient
    @Override
    public Double getMaxAssessedScore() {
        switch (question.getType()) {
            case EssayQuestion:
                if (evaluationType == Question.EvaluationType.Points) {
                    return maxScore == null ? 0 : maxScore;
                }
                break;
            case MultipleChoiceQuestion:
            case ClozeTestQuestion:
                return maxScore == null ? 0 : maxScore;
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
     * If question type equals WeightedMultiChoiceQuestion, recalculates scores for old options so that max assessed
     * score won't change.
     *
     * @param option New option to add.
     */
    @Transient
    public void addOption(ExamSectionQuestionOption option, boolean preserveScores) {
        if (question.getType() != Question.Type.WeightedMultipleChoiceQuestion
                || option.getScore() == null || preserveScores) {
            options.add(option);
            return;
        }

        if (option.getScore() > 0) {
            List<ExamSectionQuestionOption> opts = options.stream().filter(o -> o.getScore() != null && o.getScore() > 0)
                    .collect(Collectors.toList());
            BigDecimal delta = calculateOptionScores(option.getScore(), opts);
            option.setScore(new BigDecimal(option.getScore()).add(delta).doubleValue());
        } else if (option.getScore() < 0) {
            List<ExamSectionQuestionOption> opts = options.stream().filter(o -> o.getScore() != null && o.getScore() < 0)
                    .collect(Collectors.toList());
            BigDecimal delta = calculateOptionScores(option.getScore(), opts);
            option.setScore(new BigDecimal(option.getScore()).add(delta).doubleValue());
        }
        options.add(option);
    }

    private void initOptionScore(Double score, List<ExamSectionQuestionOption> options) {
        BigDecimal delta = calculateOptionScores(score * -1, options);
        if (!options.isEmpty()) {
            ExamSectionQuestionOption first = options.get(0);
            first.setScore(new BigDecimal(first.getScore()).add(delta).doubleValue());
        }
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
            List<ExamSectionQuestionOption> opts = options.stream()
                    .filter(o -> o.getScore() != null && o.getScore() > 0)
                    .collect(Collectors.toList());
            initOptionScore(score, opts);
        } else if (score < 0) {
            List<ExamSectionQuestionOption> opts = options.stream()
                    .filter(o -> o.getScore() != null && o.getScore() < 0)
                    .collect(Collectors.toList());
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
        return oldSum.subtract(new BigDecimal(optionScore).add(sum));
    }

    private Double roundToTwoDigits(double score) {
        return Math.round(score * 100) / 100d;
    }
}
