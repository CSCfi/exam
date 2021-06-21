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

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.Ebean;
import io.ebean.text.PathProperties;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;
import models.Exam;
import models.User;
import models.base.GeneratedIdentityModel;
import models.questions.Question;
import models.sections.ExamSectionQuestion;
import play.mvc.Http;
import play.mvc.Result;
import sanitizers.Attrs;
import security.Authenticated;
import system.interceptors.Anonymous;

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
            exam.getExamInspections().stream().anyMatch(ei -> ei.getUser().equals(user))
        );
    }

    @Authenticated
    @Restrict({ @Group("TEACHER") })
    @Anonymous(filteredProperties = { "user", "creator", "modifier" })
    public Result getEssays(Long examId, Optional<List<Long>> ids, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, examId);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (exam == null || !exam.isInspectedOrCreatedOrOwnedBy(user)) {
            return badRequest();
        }
        List<Long> questionIds = ids.orElse(Collections.emptyList());
        // This is the ordering of essay questions in current exam
        List<Question> questionSequence = exam
            .getExamSections()
            .stream()
            .sorted()
            .flatMap(es -> es.getSectionQuestions().stream().sorted())
            .map(ExamSectionQuestion::getQuestion)
            .filter(question -> question.getType() == Question.Type.EssayQuestion)
            .filter(question -> questionIds.isEmpty() || questionIds.contains(question.getId()))
            .collect(Collectors.toList());

        // Comparator for ordering questions, have to take to account that answer's question is no longer found
        Comparator<Question> comparator = (o1, o2) -> {
            List<Long> l = questionSequence.stream().map(GeneratedIdentityModel::getId).collect(Collectors.toList());
            if (!l.contains(o1.getId())) {
                return 1;
            }
            if (!l.contains(o2.getId())) {
                return -1;
            }
            return l.indexOf(o1.getId()) - l.indexOf(o2.getId());
        };

        // Ordered map of questions to answers
        Map<Question, List<ExamSectionQuestion>> questionMap = new TreeMap<>(comparator);

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
            .collect(Collectors.toList());

        // Get evaluation criterias from parent exam section questions
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
            .map(
                e -> {
                    Question key = e.getKey();
                    String evaluationCriteria = evaluationCriteriaMap.get(key);
                    return new QuestionEntry(e.getKey(), e.getValue(), evaluationCriteria).toJson();
                }
            )
            .collect(Collectors.toList());

        String json = String.format("[%s]", String.join(", ", results));
        return writeAnonymousResult(request, ok(json).as("application/json"), exam.isAnonymous());
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
            this.question = Ebean.json().toJson(question, PathProperties.parse("(attachment(*), *)"));
            this.answers = answers.stream().map(a -> Ebean.json().toJson(a, pp)).collect(Collectors.toList());
            this.evaluationCriteria = Ebean.json().toJson(evaluationCriteria);
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
