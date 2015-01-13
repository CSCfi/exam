package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import base.RunAsTeacher;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import models.Exam;
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

    private String[] expectedPaths = new String[] {"id", "name", "course/code", "examActiveStartDate", "examActiveEndDate"};

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
                .eq("creator.id", 2l).eq("state", Exam.State.PUBLISHED.toString()).findList();
        Set<Long> ids = new HashSet<>();
        for (Exam e : activeExams) {
            e.setExamActiveStartDate(new Date());
            e.setExamActiveEndDate(DateTime.now().plusWeeks(1).toDate());
            e.update();
            ids.add(e.getId());
        }
        // Execute
        Result result = get("/activeexams");

        // Verify
        assertThat(status(result)).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertPathsExist(expectedPaths, node);

        ArrayNode exams = (ArrayNode) node;
        assertThat(exams.size()).isEqualTo(ids.size());
        for (JsonNode n : exams) {
            Exam e = deserialize(Exam.class, n);
            assertThat(e.getExamActiveEndDate().after(new Date()));
            assertThat(e.getExamActiveStartDate().before(new Date()));
            assertThat(ids.contains(e.getId()));
        }
    }

}
