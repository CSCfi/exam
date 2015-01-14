package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import base.RunAsTeacher;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import models.Exam;
import models.ExamInspection;
import org.joda.time.DateTime;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;

import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;
import static play.test.Helpers.status;

public class ExamControllerTest extends IntegrationTestCase {

    @Test
    @RunAsStudent
    public void testGetActiveExamsUnauthorized() {
        Result result = get("/activeexams");
        assertThat(status(result)).isEqualTo(403);
        assertThat(contentAsString(result)).isEqualToIgnoringCase("authentication failure");
    }

    @Test
    @RunAsTeacher
    public void testGetActiveExams() {
        // Setup
        List<Exam> activeExams = Ebean.find(Exam.class).where()
                .eq("creator.id", userId).eq("state", Exam.State.PUBLISHED.toString()).findList();
        Set<Long> ids = new HashSet<>();
        for (Exam e : activeExams) {
            e.setExamActiveStartDate(new Date());
            e.setExamActiveEndDate(DateTime.now().plusWeeks(1).toDate());
            e.update();
            ids.add(e.getId());
        }
        String[] expectedPaths = new String[]{"id", "name", "course.code", "examActiveStartDate", "examActiveEndDate"};

        // Execute
        Result result = get("/activeexams");

        // Verify
        assertThat(status(result)).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        ArrayNode exams = (ArrayNode) node;
        assertThat(exams.size()).isEqualTo(ids.size());
        assertPathsExist(node, jsonPaths(expectedPaths, exams.size()));
        for (JsonNode n : exams) {
            Exam e = deserialize(Exam.class, n);
            assertThat(e.getExamActiveEndDate().after(new Date()));
            assertThat(e.getExamActiveStartDate().before(new Date()));
            assertThat(ids.contains(e.getId()));
        }
    }

    @Test
    @RunAsStudent
    public void testCreateDraftExamUnauthorized() {
        // Execute
        Result result = get("/draft");
        assertThat(status(result)).isEqualTo(403);
        assertThat(contentAsString(result)).isEqualToIgnoringCase("authentication failure");
    }

    @Test
    @RunAsTeacher
    public void testCreateDraftExam() {
        // Setup
        int originalRowCount = Ebean.find(Exam.class).findRowCount();

        // Execute
        Result result = get("/draft");

        // Verify
        assertThat(status(result)).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        Long id = node.get("id").asLong();
        assertPathsExist(node, "id");
        Exam draft = Ebean.find(Exam.class, id);
        assertThat(draft).isNotNull();
        assertThat(draft.getName()).isEqualTo("Kirjoita tentin nimi tähän");
        assertThat(draft.getCreator().getId()).isEqualTo(userId);
        assertThat(draft.getCreated()).isNotNull();
        assertThat(draft.getState()).isEqualTo(Exam.State.DRAFT.toString());
        assertThat(draft.getExamSections().size()).isEqualTo(1);
        assertThat(draft.getExamSections().get(0).getName()).isEqualTo("Aihealue");
        assertThat(draft.getExamSections().get(0).getExpanded()).isTrue();
        assertThat(draft.getExamLanguages().size()).isEqualTo(1);
        assertThat(draft.getExamLanguages().get(0).getCode()).isEqualTo("fi");
        assertThat(draft.getExamType().getId()).isEqualTo(2);
        assertThat(draft.getExpanded()).isTrue();
        ExamInspection draftInspection = Ebean.find(ExamInspection.class).where().eq("exam.id", id).findUnique();
        assertThat(draftInspection.getUser().getId()).isEqualTo(userId);
        int rowCount = Ebean.find(Exam.class).findRowCount();
        assertThat(rowCount).isEqualTo(originalRowCount + 1);
    }

    @Test
    @RunAsTeacher
    public void testGetxam() {
        // Setup
        long id = 1L;
        Exam expected = Ebean.find(Exam.class, id);

        // Execute
        Result result = get("/exams/" + id);

        // Verify
        assertThat(status(result)).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertPathsExist(node, "id");
        Exam returned = deserialize(Exam.class, node);
        assertThat(expected.getId()).isEqualTo(returned.getId());
        assertThat(expected.getName()).isEqualTo(returned.getName());
        assertThat(expected.getAnswerLanguage()).isEqualTo(returned.getAnswerLanguage());
        assertThat(expected.getAttachment().getId()).isEqualTo(returned.getAttachment().getId());
        assertThat(expected.getCourse().getId()).isEqualTo(returned.getCourse().getId());
        assertThat(expected.getCreditType()).isEqualTo(returned.getCreditType());
        assertThat(expected.getCustomCredit()).isEqualTo(returned.getCustomCredit());
        assertThat(expected.getDuration()).isEqualTo(returned.getDuration());
        assertThat(expected.getEnrollInstruction()).isEqualTo(returned.getEnrollInstruction());
        assertThat(expected.getExamActiveEndDate()).isEqualTo(returned.getExamActiveEndDate());
        assertThat(expected.getExamActiveStartDate()).isEqualTo(returned.getExamActiveStartDate());
        assertThat(expected.getExamFeedback()).isEqualTo(returned.getExamFeedback());
        

    }
}