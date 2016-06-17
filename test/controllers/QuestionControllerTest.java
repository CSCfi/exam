package controllers;

import base.IntegrationTestCase;
import base.RunAsTeacher;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.ExamSection;
import models.ExamSectionQuestion;
import models.ExamSectionQuestionOption;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import static org.fest.assertions.Assertions.assertThat;
import org.jetbrains.annotations.NotNull;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;
import static play.test.Helpers.contentAsString;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;


public class QuestionControllerTest extends IntegrationTestCase {

    @Test
    @RunAsTeacher
    public void testAddDraftEssayQuestionToExam() throws Exception {

        // Setup
        long examId = 1L;
        long sectionId = 1L;

        ExamSection section = Ebean.find(ExamSection.class, sectionId);
        assert section != null;
        int sectionQuestionCount = section.getSectionQuestions().size();

        // Create draft
        Result result = request(Helpers.POST, "/app/questions", Json.newObject().put("type", "EssayQuestion"));
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        Question question = deserialize(Question.class, node);
        assertThat(question.getType()).isEqualTo(Question.Type.EssayQuestion);

        // Update it
        JsonNode questionUpdate = Json.newObject()
                .put("type", "EssayQuestion")
                .put("id", question.getId())
                .put("question", "What is love?");
        result = request(Helpers.PUT, "/app/questions/" + question.getId(), questionUpdate);
        assertThat(result.status()).isEqualTo(200);
        node = Json.parse(contentAsString(result));
        question = deserialize(Question.class, node);

        // Add to exam
        result = request(Helpers.POST, String.format("/app/exams/%d/section/%d/0/question/%d",
                examId, sectionId, question.getId()), null);
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

        MultipleChoiceOption option = question.getOptions().get(3);
        deleteOption(option.getId());

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

        MultipleChoiceOption option = question.getOptions().get(3);
        deleteOption(option.getId());

        question = Ebean.find(Question.class, question.getId());
        assert question != null;
        assertThat(question.getOptions().size()).isEqualTo(3);
        assertExamSectionQuestion(question, 3, 4d, new Double[]{2d, 2d, -2d}, -2d);
    }

    private void deleteOption(long optionId) {
        Result result = request(Helpers.DELETE, "/app/questions/option/" + optionId, null);
        assertThat(result.status()).isEqualTo(200);
    }

    @NotNull
    private Question addNewOption(Question question, Double defaultScore, Double[] expectedDefaultScores, double minDefaultScore) {
        ObjectNode json = Json.newObject();
        json.put("option", "new");
        json.put("defaultScore", defaultScore);
        Result result = request(Helpers.POST, "/app/questions/" + question.getId() + "/option", json);
        assertThat(result.status()).isEqualTo(200);

        question = Ebean.find(Question.class, question.getId());
        assert question != null;
        assertThat(question.getOptions().size()).isEqualTo(4);
        assertThat(question.getMinDefaultScore()).isEqualTo(minDefaultScore);

        List<Double> defaultScores = question.getOptions().stream()
                .map(MultipleChoiceOption::getDefaultScore)
                .collect(Collectors.toList());
        assertThat(defaultScores).isEqualTo(Arrays.asList(expectedDefaultScores));

        return question;
    }

    @NotNull
    private Question getWeightedMultipleChoiceQuestion() {
        Question question = Ebean.find(Question.class).findList().stream()
                .filter(q -> q.getQuestion().contains("Kumpi vai kampi"))
                .filter(q -> q.getType() == Question.Type.WeightedMultipleChoiceQuestion)
                .findFirst()
                .get();
        assertThat(question.getOptions().size()).isEqualTo(3);
        return question;
    }

    private void assertExamSectionQuestion(Question question, int optionSize, Double maxScore, Double[] expectedScores, double minScore) {
        Set<ExamSectionQuestion> examSectionQuestions = question.getExamSectionQuestions();
        assertThat(examSectionQuestions.size()).isEqualTo(1);

        ExamSectionQuestion esq = examSectionQuestions.iterator().next();

        assertThat(esq.getOptions().size()).isEqualTo(optionSize);
        assertThat(esq.getMaxAssessedScore()).isEqualTo(maxScore);
        assertThat(esq.getMinScore()).isEqualTo(minScore);

        List<Double> scores = esq.getOptions().stream()
                .map(ExamSectionQuestionOption::getScore)
                .collect(Collectors.toList());
        assertThat(scores).isEqualTo(Arrays.asList(expectedScores));
    }

}
