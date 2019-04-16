package backend.controllers.base;

import java.util.Collection;
import java.util.Optional;

import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.Ebean;
import org.jsoup.Jsoup;
import org.jsoup.safety.Whitelist;
import play.mvc.Result;
import play.mvc.Results;

import backend.models.User;
import backend.models.api.Sortable;
import backend.models.questions.MultipleChoiceOption;
import backend.models.questions.Question;
import backend.models.sections.ExamSectionQuestion;
import backend.models.sections.ExamSectionQuestionOption;
import backend.sanitizers.SanitizingHelper;
import backend.util.AppUtil;

public interface SectionQuestionHandler {

    default Optional<Result> checkBounds(Integer from, Integer to) {
        if (from < 0 || to < 0) {
            return Optional.of(Results.badRequest());
        }
        if (from.equals(to)) {
            return Optional.of(Results.ok());
        }
        return Optional.empty();
    }

    default void saveOption(MultipleChoiceOption option, Question question, User user) {
        question.getOptions().add(option);
        AppUtil.setModifier(question, user);
        question.save();
        option.save();
    }

    default void updateOptions(ExamSectionQuestion sectionQuestion, Question question) {
        sectionQuestion.getOptions().clear();
        for (MultipleChoiceOption option : question.getOptions()) {
            ExamSectionQuestionOption esqo = new ExamSectionQuestionOption();
            esqo.setOption(option);
            esqo.setScore(option.getDefaultScore());
            sectionQuestion.getOptions().add(esqo);
        }
    }

    default void propagateOptionCreationToExamQuestions(Question question, ExamSectionQuestion modifiedExamQuestion,
                                                        MultipleChoiceOption option) {
        // Need to add the new option to bound exam section questions as well
        if (question.getType() == Question.Type.MultipleChoiceQuestion
                || question.getType() == Question.Type.WeightedMultipleChoiceQuestion) {
            for (ExamSectionQuestion examQuestion : question.getExamSectionQuestions()) {
                ExamSectionQuestionOption esqo = new ExamSectionQuestionOption();
                // Preserve scores for the exam question that is under modification right now
                boolean preserveScore = modifiedExamQuestion != null && modifiedExamQuestion.equals(examQuestion);
                Double unroundedScore = preserveScore ?
                        option.getDefaultScore() :
                        calculateOptionScore(question, option, examQuestion);
                esqo.setScore(unroundedScore == null ? null : round(unroundedScore));
                esqo.setOption(option);
                examQuestion.addOption(esqo, preserveScore);
                examQuestion.update();
            }
        }
    }

    /**
     * Calculates new option score for ExamSectionQuestionOption.
     *
     * @param question Base question.
     * @param option   New added option.
     * @param esq      ExamSectionQuestion.
     * @return New calculated score rounded to two decimals.
     */
    default Double calculateOptionScore(Question question, MultipleChoiceOption option, ExamSectionQuestion esq) {
        Double defaultScore = option.getDefaultScore();
        if (defaultScore == null || defaultScore == 0) {
            return defaultScore;
        }

        double result = 0.0;
        if (defaultScore > 0) {
            result = (esq.getMaxAssessedScore() / 100) * ((defaultScore / question.getMaxDefaultScore()) * 100);
        } else if (defaultScore < 0) {
            result = (esq.getMinScore() / 100) * ((defaultScore / question.getMinDefaultScore()) * 100);
        }
        return result;
    }


    default void updateSequences(Collection<? extends Sortable> sortables, int ordinal) {
        // Increase sequences for the entries above the inserted one
        for (Sortable s : sortables) {
            int sequenceNumber = s.getOrdinal();
            if (sequenceNumber >= ordinal) {
                s.setOrdinal(sequenceNumber + 1);
            }
        }
    }

    enum OptionUpdateOptions {SKIP_DEFAULTS, HANDLE_DEFAULTS}

    default void updateOption(JsonNode node, OptionUpdateOptions defaults) {
        Long id = SanitizingHelper.parse("id", node, Long.class).orElse(null);
        MultipleChoiceOption option = Ebean.find(MultipleChoiceOption.class, id);
        if (option != null) {
            option.setOption(SanitizingHelper.parse("option", node, String.class).orElse(null));
            if (defaults == OptionUpdateOptions.HANDLE_DEFAULTS) {
                option.setDefaultScore(
                        round(SanitizingHelper.parse("defaultScore", node, Double.class).orElse(null))
                );
            }
            option.setCorrectOption(
                    SanitizingHelper.parse("correctOption", node, Boolean.class, Boolean.FALSE));
            option.update();
        }
    }

    default Double round(Double src) {
        return src == null ? null : Math.round(src * 100) * (1.0 / 100);
    }

    default void deleteOption(MultipleChoiceOption option) {
        Question question = option.getQuestion();
        if (question.getType() == Question.Type.WeightedMultipleChoiceQuestion) {
            for (ExamSectionQuestion esq : question.getExamSectionQuestions()) {
                esq.removeOption(option, false);
                esq.save();
            }
        }
        option.delete();
    }

    default void updateExamQuestion(ExamSectionQuestion sectionQuestion, Question question) {
        sectionQuestion.setQuestion(question);
        sectionQuestion.setMaxScore(question.getDefaultMaxScore());
        String answerInstructions = question.getDefaultAnswerInstructions();
        sectionQuestion.setAnswerInstructions(
                answerInstructions == null ? null : Jsoup.clean(answerInstructions, Whitelist.relaxed())
        );
        String evaluationCriteria = question.getDefaultEvaluationCriteria();
        sectionQuestion.setEvaluationCriteria(
                evaluationCriteria == null ? null : Jsoup.clean(evaluationCriteria, Whitelist.relaxed())
        );
        sectionQuestion.setEvaluationType(question.getDefaultEvaluationType());
        sectionQuestion.setExpectedWordCount(question.getDefaultExpectedWordCount());
        updateOptions(sectionQuestion, question);
    }

}
