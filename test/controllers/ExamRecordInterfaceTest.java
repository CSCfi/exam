package controllers;

import base.IntegrationTestCase;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.joda.time.DateTime;
import org.junit.Test;
import play.libs.Json;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

public class ExamRecordInterfaceTest extends IntegrationTestCase {

    @Test
    public void testGetRecords() {
        String filter = DateTime.now().toString("yyyy-MM-dd");
        play.mvc.Result result = get("/integration/record/" + filter);
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node.isArray()).isTrue();
        ArrayNode records = (ArrayNode) node;
        assertThat(records).hasSize(0);
    }

}
