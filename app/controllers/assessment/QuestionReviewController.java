// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assessment;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.text.PathProperties;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;
import models.base.GeneratedIdentityModel;
import models.exam.Exam;
import models.questions.Question;
import models.sections.ExamSectionQuestion;
import models.user.User;
import play.mvc.Http;
import play.mvc.Result;
import security.Authenticated;
import system.interceptors.Anonymous;
import validation.core.Attrs;

public class QuestionReviewController extends BaseController {

    private static final Exam.State[] VALID_STATES = {
        Exam.State.REVIEW,
        Exam.State.REVIEW_STARTED,
        Exam.State.GRADED,
        Exam.State.GRADED_LOGGED,
        Exam.State.REJECTED,
    };

    private boolean canAssess(User user, Exam exam) {
        return (
            exam.getParent().getExamOwners().contains(user) ||
            exam
                .getExamInspections()
                .stream()
                .anyMatch(ei -> ei.getUser().equals(user))
        );
    }

    @Authenticated
    @Restrict({ @Group("TEACHER") })
    @Anonymous(filteredProperties = { "user", "creator", "modifier" })
    public Result getEssays(Long examId, Optional<List<Long>> ids, Http.Request request) {
        Exam exam = DB.find(Exam.class, examId);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (exam == null || !exam.isInspectedOrCreatedOrOwnedBy(user)) {
            return badRequest();
        }
        List<Long> questionIds = ids.orElse(Collections.emptyList());
        // This is the ordering of essay questions in the current exam
        List<Question> questionSequence = exam
            .getExamSections()
            .stream()
            .sorted()
            .flatMap(es -> es.getSectionQuestions().stream().sorted())
            .map(ExamSectionQuestion::getQuestion)
            .filter(question -> question.getType() == Question.Type.EssayQuestion)
            .filter(question -> questionIds.isEmpty() || questionIds.contains(question.getId()))
            .toList();

        // Ordered map for questions, have to take into account that answer's question is no longer found
        Map<Question, List<ExamSectionQuestion>> questionMap = createMapping(questionSequence);

        // All the answers for questions in this exam
        List<ExamSectionQuestion> answers = exam
            .getChildren()
            .stream()
            .filter(e -> canAssess(user, e))
            .filter(e -> Arrays.asList(VALID_STATES).contains(e.getState()))
            .flatMap(e -> e.getExamSections().stream())
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getQuestion().getType() == Question.Type.EssayQuestion)
            .filter(esq -> questionIds.isEmpty() || questionIds.contains(esq.getQuestion().getParent().getId()))
            .toList();

        // Get evaluation criteria from parent exam section questions
        Map<Question, String> evaluationCriteriaMap = exam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getQuestion().getType() == Question.Type.EssayQuestion)
            .filter(esq -> esq.getEvaluationCriteria() != null && esq.getQuestion() != null)
            .collect(
                Collectors.toMap(
                    ExamSectionQuestion::getQuestion,
                    ExamSectionQuestion::getEvaluationCriteria,
                    (existing, replacement) -> existing
                )
            );

        // Group essay answers by question and throw them in the ordered map
        questionMap.putAll(answers.stream().collect(Collectors.groupingBy(esq -> esq.getQuestion().getParent())));

        // Questions without answers, add separately because they aren't found through student exams
        questionSequence
            .stream()
            .filter(q -> !questionMap.containsKey(q))
            .forEach(q -> questionMap.put(q, Collections.emptyList()));

        // Pack as DTOs and serialize to JSON
        List<String> results = questionMap
            .entrySet()
            .stream()
            .map(e -> {
                Question key = e.getKey();
                String evaluationCriteria = evaluationCriteriaMap.get(key);
                return new QuestionEntry(e.getKey(), e.getValue(), evaluationCriteria).toJson();
            })
            .toList();

        String json = String.format("[%s]", String.join(", ", results));
        return writeAnonymousResult(request, ok(json).as("application/json"), exam.isAnonymous());
    }

    private static Map<Question, List<ExamSectionQuestion>> createMapping(List<Question> questions) {
        Comparator<Question> comparator = (o1, o2) -> {
            List<Long> ids = questions.stream().map(GeneratedIdentityModel::getId).toList();
            if (!ids.contains(o1.getId())) {
                return 1;
            }
            if (!ids.contains(o2.getId())) {
                return -1;
            }
            return ids.indexOf(o1.getId()) - ids.indexOf(o2.getId());
        };

        // Ordered map of questions into answers
        return new TreeMap<>(comparator);
    }

    // DTO
    private static class QuestionEntry {

        private final String question;
        private final List<String> answers;
        private final String evaluationCriteria;

        QuestionEntry(Question question, List<ExamSectionQuestion> answers, String evaluationCriteria) {
            PathProperties pp = PathProperties.parse(
                "(*, essayAnswer(attachment(*), *), question(parent(question), attachment(*), *), " +
                    "examSection(name, exam(id, hash, creator(id, email, userIdentifier, firstName, lastName), " +
                    "state, examInspections(user(id)))))"
            );
            this.question = DB.json().toJson(question, PathProperties.parse("(attachment(*), *)"));
            this.answers = answers
                .stream()
                .map(a -> DB.json().toJson(a, pp))
                .toList();
            this.evaluationCriteria = DB.json().toJson(evaluationCriteria);
        }

        private String toJson() {
            return String.format(
                "{\"question\": %s, \"answers\": %s, \"evaluationCriteria\": %s}",
                question,
                answers,
                evaluationCriteria
            );
        }
    }
}
