package controllers;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import base.IntegrationTestCase;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.ebean.Ebean;
import org.jetbrains.annotations.NotNull;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

import backend.models.ExamSection;
import backend.models.ExamSectionQuestion;
import backend.models.ExamSectionQuestionOption;
import backend.models.User;
import backend.models.questions.MultipleChoiceOption;
import backend.models.questions.Question;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;


public class QuestionControllerTest extends IntegrationTestCase {

    @Test
    @RunAsTeacher
    public void testAddEssayQuestionToExam() throws Exception {

        // Setup
        long examId = 1L;
        long sectionId = 1L;

        ExamSection section = Ebean.find(ExamSection.class, sectionId);
        assert section != null;
        int sectionQuestionCount = section.getSectionQuestions().size();

        JsonNode draft = Json.newObject().put("type", "EssayQuestion")
                .put("question", "What is love?")
                .put("defaultMaxScore", 2)
                .put("defaultEvaluationType", "Points")
                .set("questionOwners", Json.newArray().add(
                        Json.newObject().put("id", userId))
                );

        // Create draft
        Result result = request(Helpers.POST, "/app/questions", draft);
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        Question question = deserialize(Question.class, node);
        assertThat(question.getType()).isEqualTo(Question.Type.EssayQuestion);

        // Update it
        JsonNode update = Json.newObject().put("type", "EssayQuestion")
                .put("question", "What is love now?")
                .put("defaultMaxScore", 3)
                .put("defaultEvaluationType", "Selection")
                .set("questionOwners", Json.newArray().add(
                        Json.newObject().put("id", userId))
                );
        result = request(Helpers.PUT, "/app/questions/" + question.getId(), update);
        assertThat(result.status()).isEqualTo(200);
        node = Json.parse(contentAsString(result));
        question = deserialize(Question.class, node);

        // Add to exam
        result = request(Helpers.POST, String.format("/app/exams/%d/sections/%d/questions/%d",
                examId, sectionId, question.getId()), Json.newObject().put("sequenceNumber", 0));
        assertThat(result.status()).isEqualTo(200);
        node = Json.parse(contentAsString(result));
        ExamSection deserialized = deserialize(ExamSection.class, node);
        assertThat(deserialized.getSectionQuestions().size()).isEqualTo(sectionQuestionCount + 1);

        // Check that section now has a reference to the original question
        assertThat(Ebean.find(ExamSectionQuestion.class).where()
                .eq("question.id", question.getId()).findUnique()).isNotNull();
    }

    @Test
    @RunAsTeacher
    public void testAddingOptionToWeightedMultipleChoiceQuestion() throws Exception {
        Question question = getWeightedMultipleChoiceQuestion();

        assertExamSectionQuestion(question, 3, 4d, new Double[]{2d, 2d, -2d}, -2d);

        // Add new option to question
        question = addNewOption(question, 0.75, new Double[]{1d, 1d, -1d, 0.75d}, -1d);

        assertExamSectionQuestion(question, 4, 4d, new Double[]{1.46d, 1.46d, -2d, 1.08d}, -2d);
    }


        @Test
        @RunAsTeacher
        public void testAddingNullScoreOptionToWeightedMultipleChoiceQuestion() throws Exception {
            Question question = getWeightedMultipleChoiceQuestion();

            assertExamSectionQuestion(question, 3, 4d, new Double[]{2d, 2d, -2d}, -2d);

            // Add new option to question
            question = addNewOption(question, null, new Double[]{1d, 1d, -1d, null}, -1d);

            assertExamSectionQuestion(question, 4, 4d, new Double[]{2d, 2d, -2d, null}, -2d);
        }

        @Test
        @RunAsTeacher
        public void testAddingNegativeOptionToWeightedMultipleChoiceQuestion() throws Exception {
            Question question = getWeightedMultipleChoiceQuestion();

            assertExamSectionQuestion(question, 3, 4d, new Double[]{2d, 2d, -2d}, -2d);

            // Add new option to question
            question = addNewOption(question, -0.73, new Double[]{1d, 1d, -1d, -0.73d}, -1.73d);

            assertExamSectionQuestion(question, 4, 4d, new Double[]{2d, 2d, -1.16d, -0.84d}, -2d);
        }

        @Test
        @RunAsTeacher
        public void testDeleteOptionFromWeightedMultipleChoiceQuestion() throws Exception {
            Question question = getWeightedMultipleChoiceQuestion();
            // Add new option to question and then delete it
            assertExamSectionQuestion(question, 3, 4d, new Double[]{2d, 2d, -2d}, -2d);
            question = addNewOption(question, 0.75, new Double[]{1d, 1d, -1d, 0.75d}, -1d);
            assertExamSectionQuestion(question, 4, 4d, new Double[]{1.46d, 1.46d, -2d, 1.08d}, -2d);

            deleteAddedOption(question);

            question = Ebean.find(Question.class, question.getId());
            assert question != null;
            assertThat(question.getOptions().size()).isEqualTo(3);
            assertExamSectionQuestion(question, 3, 4d, new Double[]{2d, 2d, -2d}, -2d);
        }

        @Test
        @RunAsTeacher
        public void testDeleteNegativeOptionFromWeightedMultipleChoiceQuestion() throws Exception {
            Question question = getWeightedMultipleChoiceQuestion();
            // Add new option to question and then delete it
            assertExamSectionQuestion(question, 3, 4d, new Double[]{2d, 2d, -2d}, -2d);
            question = addNewOption(question, -0.5, new Double[]{1d, 1d, -1d, -0.5d}, -1.5d);
            assertExamSectionQuestion(question, 4, 4d, new Double[]{2d, 2d, -1.33d, -0.67d}, -2d);

            deleteAddedOption(question);

            question = Ebean.find(Question.class, question.getId());
            assert question != null;
            assertThat(question.getOptions().size()).isEqualTo(3);
            assertExamSectionQuestion(question, 3, 4d, new Double[]{2d, 2d, -2d}, -2d);
        }

    private void deleteAddedOption(Question question) {
        List<MultipleChoiceOption> options = question.getOptions().stream().sorted(MultipleChoiceOption::compareTo).collect(Collectors.toList());
        JsonNode json = Json.newObject()
                .put("id", question.getId())
                .put("type", "WeightedMultipleChoiceQuestion")
                .put("question", question.getQuestion())
                .set("options", Json.newArray().add(
                        Json.newObject().put("id", options.get(0).getId()).put("defaultScore", 1.0).put("option", "Kumpi")).add(
                        Json.newObject().put("id", options.get(1).getId()).put("defaultScore", 1.0).put("option", "Kampi")).add(
                        Json.newObject().put("id", options.get(2).getId()).put("defaultScore", -1.0).put("option", "Molemmat")));
        ((ObjectNode) json).set("questionOwners", Json.newArray()
                .add(Json.newObject().put("id", userId)));

        Result result = request(Helpers.PUT, "/app/questions/" + question.getId(), json);
        assertThat(result.status()).isEqualTo(200);
    }

    @NotNull
    private Question addNewOption(Question question, Double defaultScore, Double[] expectedDefaultScores, double minDefaultScore) {
        List<MultipleChoiceOption> options = question.getOptions().stream().sorted(MultipleChoiceOption::compareTo).collect(Collectors.toList());
        JsonNode json = Json.newObject()
                .put("id", question.getId())
                .put("type", "WeightedMultipleChoiceQuestion")
                .put("question", question.getQuestion())
                .set("options", Json.newArray().add(
                        Json.newObject().put("id", options.get(0).getId()).put("defaultScore", 1.0).put("option", "Kumpi")).add(
                        Json.newObject().put("id", options.get(1).getId()).put("defaultScore", 1.0).put("option", "Kampi")).add(
                        Json.newObject().put("id", options.get(2).getId()).put("defaultScore", -1.0).put("option", "Molemmat")).add(
                        Json.newObject().put("defaultScore", defaultScore).put("option", "Uusi"))
                );
        ((ObjectNode) json).set("questionOwners", Json.newArray()
                .add(Json.newObject().put("id", userId)));
        Result result = request(Helpers.PUT, "/app/questions/" + question.getId(), json);
        assertThat(result.status()).isEqualTo(200);

        Question saved = Ebean.find(Question.class, question.getId());
        assertThat(saved).isNotNull();
        assertThat(saved.getOptions().size()).isEqualTo(4);
        assertThat(saved.getMinDefaultScore()).isEqualTo(minDefaultScore);

        List<Double> defaultScores = saved.getOptions().stream()
                .sorted(Comparator.comparing(MultipleChoiceOption::getId))
                .map(MultipleChoiceOption::getDefaultScore)
                .collect(Collectors.toList());
        assertThat(defaultScores).isEqualTo(Arrays.asList(expectedDefaultScores));

        return saved;
    }

    @NotNull
    private Question getWeightedMultipleChoiceQuestion() {
        Question question = Ebean.find(Question.class).findList().stream()
                .filter(q -> q.getQuestion().contains("Kumpi vai kampi"))
                .filter(q -> q.getType() == Question.Type.WeightedMultipleChoiceQuestion)
                .findFirst()
                .get();
        assertThat(question.getOptions().size()).isEqualTo(3);
        question.getQuestionOwners().add(Ebean.find(User.class, userId));
        question.update();
        return question;
    }

    private void assertExamSectionQuestion(Question question, int optionSize, Double maxScore, Double[] expectedScores, double minScore) {
        Set<ExamSectionQuestion> examSectionQuestions = question.getExamSectionQuestions();
        assertThat(examSectionQuestions.size()).isEqualTo(1);

        ExamSectionQuestion esq = examSectionQuestions.iterator().next();


        assertThat(esq.getOptions().size()).isEqualTo(optionSize);

        assertThat(esq.getMinScore()).isEqualTo(minScore);

        assertThat(esq.getMaxAssessedScore()).isEqualTo(maxScore);

        List<Double> scores = esq.getOptions().stream()
                .map(ExamSectionQuestionOption::getScore)
                .collect(Collectors.toList());
        assertThat(scores).isEqualTo(Arrays.asList(expectedScores));
    }

}
