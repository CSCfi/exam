package controllers;

import base.IntegrationTestCase;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.avaje.ebean.Ebean;
import models.Exam;
import org.joda.time.DateTime;
import org.junit.Before;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

public class ExamAPIControllerTest extends IntegrationTestCase {

    private List<Exam> exams;

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();
        exams = Ebean.find(Exam.class).findList();
        exams.subList(0, 3).forEach(e -> {
            e.setExamActiveStartDate(DateTime.now().minusDays(4).toDate());
            e.setExamActiveEndDate(DateTime.now().plusDays(4).toDate());
            e.setState(Exam.State.PUBLISHED);
            e.update();
        });
    }

    @Test
    public void testGetActiveExams() {
        Result result = get("/integration/exams/active");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node.isArray()).isTrue();
        ArrayNode records = (ArrayNode) node;
        assertThat(records).hasSize(3);

        String filter = DateTime.now().minusDays(5).toString("yyyy-MM-dd");
        result = get("/integration/exams/active?date=" + filter);
        assertThat(result.status()).isEqualTo(200);
        node = Json.parse(contentAsString(result));
        assertThat(node.isArray()).isTrue();
        records = (ArrayNode) node;
        assertThat(records).isEmpty();
    }

}
