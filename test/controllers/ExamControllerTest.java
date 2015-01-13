package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;
import static play.test.Helpers.status;

public class ExamControllerTest extends IntegrationTestCase{

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
        Result result = get("/activeexams");
        assertThat(status(result)).isEqualTo(200);
        JsonNode exams = Json.parse(contentAsString(result));
    }

}
