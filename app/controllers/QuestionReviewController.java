package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.Ebean;
import io.ebean.text.PathProperties;
import models.Exam;
import models.ExamSectionQuestion;
import models.questions.Question;
import play.mvc.Result;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;


public class QuestionReviewController extends BaseController {

    private static final Exam.State VALID_STATES[] = {Exam.State.REVIEW, Exam.State.REVIEW_STARTED, Exam.State.GRADED,
            Exam.State.GRADED_LOGGED, Exam.State.REJECTED};

    @Restrict({@Group("TEACHER")})
    public Result getEssays(Long examId) {
        Exam exam = Ebean.find(Exam.class, examId);
        if (exam == null || !exam.isInspectedOrCreatedOrOwnedBy(getLoggedUser())) {
            return badRequest();
        }
        // This is the ordering of essay questions in current exam
        List<Long> questionSequence = exam.getExamSections().stream().sorted()
                .flatMap(es -> es.getSectionQuestions().stream().sorted())
                .filter(esq -> esq.getQuestion().getType() == Question.Type.EssayQuestion)
                .map(esq -> esq.getQuestion().getId())
                .collect(Collectors.toList());

        // Ordered map of questions to answers (might need to separately check indices that are -1)
        Map<Question, List<ExamSectionQuestion>> questionMap = new TreeMap<>(
                Comparator.comparingInt(o -> questionSequence.indexOf(o.getId())));

        // All the answers for questions in this exam
        List<ExamSectionQuestion> answers = exam.getChildren().stream()
                .filter(e -> Arrays.asList(VALID_STATES).contains(e.getState()))
                .flatMap(e -> e.getExamSections().stream())
                .flatMap(es -> es.getSectionQuestions().stream())
                .filter(esq -> esq.getQuestion().getType() == Question.Type.EssayQuestion)
                .collect(Collectors.toList());

        // Group essay answers by question and throw them in the ordered map
        questionMap.putAll(answers.stream().collect(
                Collectors.groupingBy(esq -> esq.getQuestion().getParent())));

        // Pack as DTOs and serialize to JSON
        List<String> results = questionMap.entrySet().stream()
                .map(e -> new QuestionEntry(e.getKey(), e.getValue()).toJson())
                .collect(Collectors.toList());
        String json = String.format("[%s]", results.stream().collect(Collectors.joining(", ")));
        return ok(json).as("application/json");
    }

    // DTO
    private static class QuestionEntry {
        private String question;
        private List<String> answers;

        QuestionEntry(Question question, List<ExamSectionQuestion> answers) {
            PathProperties pp = PathProperties.parse("(*, essayAnswer(*), question(*), examSections(name)");
            this.question = Ebean.json().toJson(question, PathProperties.parse("(*)"));
            this.answers = answers.stream().map(a -> Ebean.json().toJson(a, pp)).collect(Collectors.toList());
        }

        private String toJson() {
            return String.format("{\"question\": %s, \"answers\": %s}", question, answers);
        }

    }
}
