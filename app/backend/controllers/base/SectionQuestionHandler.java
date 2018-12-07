package backend.controllers.base;

import java.util.Collection;
import java.util.Optional;

import play.mvc.Result;
import play.mvc.Results;

import backend.models.ExamSectionQuestion;
import backend.models.ExamSectionQuestionOption;
import backend.models.api.Sortable;
import backend.models.questions.MultipleChoiceOption;
import backend.models.questions.Question;

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

    default void updateOptions(ExamSectionQuestion sectionQuestion, Question question) {
        sectionQuestion.getOptions().clear();
        for (MultipleChoiceOption option : question.getOptions()) {
            ExamSectionQuestionOption esqo = new ExamSectionQuestionOption();
            esqo.setOption(option);
            esqo.setScore(option.getDefaultScore());
            sectionQuestion.getOptions().add(esqo);
        }
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

    default void updateExamQuestion(ExamSectionQuestion sectionQuestion, Question question) {
        sectionQuestion.setQuestion(question);
        sectionQuestion.setMaxScore(question.getDefaultMaxScore());
        sectionQuestion.setAnswerInstructions(question.getDefaultAnswerInstructions());
        sectionQuestion.setEvaluationCriteria(question.getDefaultEvaluationCriteria());
        sectionQuestion.setEvaluationType(question.getDefaultEvaluationType());
        sectionQuestion.setExpectedWordCount(question.getDefaultExpectedWordCount());
        updateOptions(sectionQuestion, question);
    }

}
