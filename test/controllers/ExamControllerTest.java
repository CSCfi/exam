package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import base.RunAsTeacher;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import models.Exam;
import models.ExamSection;
import org.joda.time.DateTime;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

public class ExamControllerTest extends IntegrationTestCase {

    @Test
    @RunAsStudent
    public void testGetActiveExamsUnauthorized() {
        Result result = get("/app/reviewerexams");
        assertThat(result.status()).isEqualTo(403);
        assertThat(contentAsString(result)).isEqualToIgnoringCase("authentication failure");
    }

    @Test
    @RunAsTeacher
    public void testGetActiveExams() {
        // Setup
        List<Exam> activeExams = Ebean.find(Exam.class).where()
                .eq("creator.id", userId).eq("state", Exam.State.PUBLISHED).findList();
        activeExams.stream().forEach(e -> {
            e.getExamOwners().add(e.getCreator());
            e.update();
        });
        Set<Long> ids = new HashSet<>();
        for (Exam e : activeExams) {
            e.setExamActiveStartDate(new Date());
            e.setExamActiveEndDate(DateTime.now().plusWeeks(1).toDate());
            e.update();
            ids.add(e.getId());
        }
        String[] expectedPaths = {"id", "name", "course.code", "examActiveStartDate", "examActiveEndDate"};

        // Execute
        Result result = get("/app/reviewerexams");

        // Verify
        assertThat(result.status()).isEqualTo(200);
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
        Result result = request(Helpers.POST, "/app/exams", Json.newObject().put("executionType", "PUBLIC"));
        assertThat(result.status()).isEqualTo(403);
        assertThat(contentAsString(result)).isEqualToIgnoringCase("authentication failure");
    }

    @Test
    @RunAsTeacher
    public void testCreateDraftExam() {
        // Setup
        int originalRowCount = Ebean.find(Exam.class).findRowCount();

        // Execute
        Result result = request(Helpers.POST, "/app/exams", Json.newObject().put("executionType", "PUBLIC"));

        // Verify
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        Long id = node.get("id").asLong();
        Exam draft = Ebean.find(Exam.class, id);
        assertThat(draft).isNotNull();
        assertThat(draft.getName()).isNull();
        assertThat(draft.getCreator().getId()).isEqualTo(userId);
        assertThat(draft.getCreated()).isNotNull();
        assertThat(draft.getState()).isEqualTo(Exam.State.DRAFT);
        assertThat(draft.getExamSections().size()).isEqualTo(1);
        ExamSection section = draft.getExamSections().iterator().next();
        assertThat(section.getName()).isNull();
        assertThat(section.getExpanded()).isTrue();
        assertThat(draft.getExamLanguages().size()).isEqualTo(1);
        assertThat(draft.getExamLanguages().get(0).getCode()).isEqualTo("fi");
        assertThat(draft.getExamType().getId()).isEqualTo(2);
        assertThat(draft.getExpanded()).isTrue();
        int rowCount = Ebean.find(Exam.class).findRowCount();
        assertThat(rowCount).isEqualTo(originalRowCount + 1);
    }


    @Test
    @RunAsTeacher
    public void testGetExam() throws Exception {
        // Setup
        long id = 1L;
        Exam expected = Ebean.find(Exam.class, id);
        // Execute
        Result result = get("/app/exams/" + id);

        // Verify that some paths exist in JSON, this is a significant set of information so really hard to test it's
        // all there :p
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertPathsExist(node, getExamFields());
        assertPathCounts(node, 3, getExamSectionFieldsOfExam("*"));
        assertPathCounts(node, 2, "softwares[*].id", "softwares[*].name");
        assertPathCounts(node, 4, "examLanguages[*].code");

        // Verify some of the field values are as expected
        Exam returned = deserialize(Exam.class, node);
        assertThat(expected.getId()).isEqualTo(returned.getId());
        assertThat(expected.getName()).isEqualTo(returned.getName());
        assertThat(expected.getAnswerLanguage()).isEqualTo(returned.getAnswerLanguage());
        assertThat(expected.getCourse().getId()).isEqualTo(returned.getCourse().getId());
        assertThat(expected.getCreditType()).isEqualTo(returned.getCreditType());
        assertThat(expected.getCustomCredit()).isEqualTo(returned.getCustomCredit());
        assertThat(expected.getDuration()).isEqualTo(returned.getDuration());
        assertThat(expected.getEnrollInstruction()).isEqualTo(returned.getEnrollInstruction());
        assertThat(expected.getExamActiveEndDate()).isEqualTo(returned.getExamActiveEndDate());
        assertThat(expected.getExamActiveStartDate()).isEqualTo(returned.getExamActiveStartDate());
    }

    @Test
    @RunAsTeacher
    public void testGetStudentExamNotAllowed() {
        // Setup
        long id = 1L;
        Exam expected = Ebean.find(Exam.class, id);
        expected.setState(Exam.State.STUDENT_STARTED);
        expected.update();

        // Execute
        Result result = get("/app/exams/" + id);
        assertThat(result.status()).isEqualTo(404);
    }

    private String[] getExamFields() {
        return new String[]{"id", "name", "course.id", "course.code", "course.name", "course.level",
                "course.courseUnitType", "course.credits", "course.institutionName", "course.department", "parent",
                "examType", "instruction", "enrollInstruction", "shared", "examActiveStartDate",
                "examActiveEndDate", "duration", "gradeScale", "gradeScale.description", "grade",
                "customCredit", "answerLanguage", "state", "examFeedback", "creditType", "expanded",
                "attachment"};
    }

    private String[] getExamSectionFieldsOfExam(String index) {
        String[] fields = {"name", "id", "expanded", "lotteryOn", "sequenceNumber", "description", "lotteryItemCount"};
        for (int i = 0; i < fields.length; ++i) {
            fields[i] = "examSections[" + index + "]." + fields[i];
        }
        return fields;
    }

}
