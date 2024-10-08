package controllers;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import base.IntegrationTestCase;
import base.RunAsAdmin;
import base.RunAsStudent;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.DB;
import models.ExamRoom;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

public class RoomControllerTest extends IntegrationTestCase {

    @Test
    @RunAsAdmin
    public void testDisableRoom() throws Exception {
        // Setup
        ExamRoom room = DB.find(ExamRoom.class, 1L);
        assertThat(room.getState()).isNotEqualTo(ExamRoom.State.INACTIVE.toString());

        // Execute
        Result result = request(Helpers.DELETE, "/app/rooms/" + 1, null);
        assertThat(result.status()).isEqualTo(200);

        // Verify (both response and database)
        JsonNode node = Json.parse(contentAsString(result));
        ExamRoom deserialized = deserialize(ExamRoom.class, node);
        assertThat(deserialized.getState()).isEqualTo(ExamRoom.State.INACTIVE.toString());

        room = DB.find(ExamRoom.class, 1L);
        assertThat(room.getState()).isEqualTo(ExamRoom.State.INACTIVE.toString());
    }

    @Test
    @RunAsStudent
    public void testDisabledRoomNotVisibleToStudent() throws Exception {
        // Setup
        ExamRoom room = DB.find(ExamRoom.class, 1L);
        room.setState(ExamRoom.State.INACTIVE.toString());
        room.update();

        // Execute
        Result result = get("/app/rooms");
        assertThat(result.status()).isEqualTo(200);

        // Verify
        JsonNode node = Json.parse(contentAsString(result));
        assertPathsDoNotExist(node, String.format("$.[?(@.id == %s)]", room.getId()));
    }

    @Test
    @RunAsAdmin
    public void testEnableRoom() throws Exception {
        // Setup
        ExamRoom room = DB.find(ExamRoom.class, 1L);
        room.setState(ExamRoom.State.INACTIVE.toString());
        room.update();

        // Execute
        Result result = request(Helpers.POST, "/app/rooms/" + 1, null);
        assertThat(result.status()).isEqualTo(200);

        // Verify (both response and database)
        JsonNode node = Json.parse(contentAsString(result));
        ExamRoom deserialized = deserialize(ExamRoom.class, node);
        assertThat(deserialized.getState()).isEqualTo(ExamRoom.State.ACTIVE.toString());

        room = DB.find(ExamRoom.class, 1L);
        assertThat(room.getState()).isEqualTo(ExamRoom.State.ACTIVE.toString());
    }

    @Test
    @RunAsStudent
    public void testEnabledRoomVisibleToStudent() throws Exception {
        // Setup
        ExamRoom room = DB.find(ExamRoom.class, 1L);
        room.setState(ExamRoom.State.ACTIVE.toString());
        room.update();

        // Execute
        Result result = get("/app/rooms");
        assertThat(result.status()).isEqualTo(200);

        // Verify
        JsonNode node = Json.parse(contentAsString(result));
        assertPathsExist(node, String.format("$.[?(@.id == %s)]", room.getId()));
    }
}
