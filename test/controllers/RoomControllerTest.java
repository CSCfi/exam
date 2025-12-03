// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import base.IntegrationTestCase;
import base.RunAsAdmin;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.DB;
import models.facility.ExamRoom;
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
}
