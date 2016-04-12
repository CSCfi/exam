package controllers;

import base.IntegrationTestCase;
import base.RunAsTeacher;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import models.ExamSection;
import models.ExamSectionQuestion;
import models.questions.Question;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;


public class QuestionControllerTest extends IntegrationTestCase {

    @Test
    @RunAsTeacher
    public void testAddDraftEssayQuestionToExam() throws Exception {

        // Setup
        long examId = 1L;
        long sectionId = 1L;
        ExamSection section = Ebean.find(ExamSection.class, sectionId);
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

        // Check that section now has a clone of the original question
        assertThat(Ebean.find(ExamSectionQuestion.class).where()
                .eq("question.parent.id", question.getId()).findUnique()).isNotNull();
    }



}
