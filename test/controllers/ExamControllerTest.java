// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import base.IntegrationTestCase;
import base.RunAsStudent;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.DB;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import models.exam.Exam;
import models.exam.ExamType;
import models.sections.ExamSection;
import org.joda.time.DateTime;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.test.Helpers;

public class ExamControllerTest extends IntegrationTestCase {

    @Test
    @RunAsStudent
    public void testGetActiveExamsUnauthorized() {
        Result result = get("/app/reviewerexams");
        assertThat(result.status()).isEqualTo(Http.Status.FORBIDDEN);
        assertThat(contentAsString(result)).isEqualToIgnoringCase("authentication failure");
    }

    @Test
    @RunAsTeacher
    public void testGetActiveExams() {
        // Setup
        List<Exam> activeExams = DB.find(Exam.class)
            .where()
            .eq("creator.id", userId)
            .in("state", Exam.State.PUBLISHED, Exam.State.SAVED, Exam.State.DRAFT)
            .findList();
        activeExams.forEach(e -> {
            e.getExamOwners().add(e.getCreator());
            e.update();
        });
        Set<Long> ids = new HashSet<>();
        for (Exam e : activeExams) {
            e.setPeriodStart(DateTime.now());
            e.setPeriodEnd(DateTime.now().plusWeeks(1));
            e.update();
            ids.add(e.getId());
        }
        String[] expectedPaths = { "id", "name", "course.code", "periodStart", "periodEnd" };

        // Execute
        Result result = get("/app/reviewerexams");

        // Verify
        assertThat(result.status()).isEqualTo(Http.Status.OK);
        JsonNode exams = Json.parse(contentAsString(result));
        assertThat(exams.size()).isEqualTo(ids.size());
        for (JsonNode n : exams) {
            Exam e = deserialize(Exam.class, n);
            assertThat(e.getPeriodEnd().isAfterNow());
            assertThat(e.getPeriodStart().isBeforeNow());
            assertThat(ids.contains(e.getId()));
        }
    }

    @Test
    @RunAsStudent
    public void testCreateDraftExamUnauthorized() {
        // Execute
        Result result = request(
            Helpers.POST,
            "/app/exams",
            Json.newObject()
                .put("implementation", "AQUARIUM")
                .set("executionType", Json.newObject().put("type", "PUBLIC"))
        );
        assertThat(result.status()).isEqualTo(Http.Status.FORBIDDEN);
        assertThat(contentAsString(result)).isEqualToIgnoringCase("authentication failure");
    }

    @Test
    @RunAsTeacher
    public void testCreateDraftExam() {
        // Setup
        int originalRowCount = DB.find(Exam.class).findCount();

        // Execute
        Result result = request(
            Helpers.POST,
            "/app/exams",
            Json.newObject()
                .put("implementation", "AQUARIUM")
                .set("executionType", Json.newObject().put("type", "PUBLIC"))
        );

        // Verify
        assertThat(result.status()).isEqualTo(Http.Status.OK);
        JsonNode node = Json.parse(contentAsString(result));
        Long id = node.get("id").asLong();
        Exam draft = DB.find(Exam.class, id);
        assertThat(draft).isNotNull();
        assertThat(draft.getName()).isNull();
        assertThat(draft.getCreator().getId()).isEqualTo(userId);
        assertThat(draft.getCreated()).isNotNull();
        assertThat(draft.getState()).isEqualTo(Exam.State.DRAFT);
        assertThat(draft.getExamSections().size()).isEqualTo(1);
        ExamSection section = draft.getExamSections().iterator().next();
        assertThat(section.getName()).isNull();
        assertThat(section.isExpanded()).isTrue();
        assertThat(draft.getExamLanguages().size()).isEqualTo(1);
        assertThat(draft.getExamLanguages().getFirst().getCode()).isEqualTo("fi");
        assertThat(draft.getExamType().getId()).isEqualTo(2);
        assertThat(draft.isAnonymous()).isTrue();
        int rowCount = DB.find(Exam.class).findCount();
        assertThat(rowCount).isEqualTo(originalRowCount + 1);
    }

    @Test
    @RunAsTeacher
    public void testGetStudentExamNotAllowed() {
        // Setup
        long id = 1L;
        Exam expected = DB.find(Exam.class, id);
        expected.setState(Exam.State.STUDENT_STARTED);
        expected.update();

        // Execute
        Result result = get("/app/exams/" + id);
        assertThat(result.status()).isEqualTo(Http.Status.NOT_FOUND);
    }

    @Test
    @RunAsTeacher
    public void testExamTypeUpdate() {
        // Setup
        final long id = 1L;
        Exam exam = DB.find(Exam.class, id);
        ExamType examType = DB.find(ExamType.class, 1L);
        exam.setExamType(examType);
        exam.save();

        // Check current state
        final String examPath = "/app/exams/" + id;
        Result result = get(examPath);
        assertThat(result.status()).isEqualTo(Http.Status.OK);
        JsonNode examJson = Json.parse(contentAsString(result));

        assertThat(examJson.has("examType")).isTrue();
        assertThat(examJson.get("examType").get("type").asText()).isEqualTo("PARTIAL");

        var update = Json.newObject()
            .put("name", exam.getName())
            .put("duration", exam.getDuration())
            .set("examType", Json.newObject().put("type", "FINAL"));

        // Send update
        result = request("PUT", examPath, update);

        assertThat(result.status()).isEqualTo(Http.Status.OK);
        JsonNode updated = Json.parse(contentAsString(result));
        var type = updated.get("examType");
        assertThat(type.get("type").asText()).isEqualTo("FINAL");
    }
}
