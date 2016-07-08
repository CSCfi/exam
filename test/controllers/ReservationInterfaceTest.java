package controllers;

import base.IntegrationTestCase;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import models.ExamRoom;
import models.calendar.ExceptionWorkingHours;
import org.joda.time.DateTime;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

public class ReservationInterfaceTest extends IntegrationTestCase {

    @Test
    public void testGetReservations() {
        String filter = DateTime.now().withYear(1999).toString("yyyy-MM-dd");
        Result result = get("/integration/reservations?start=" + filter + "&roomId=1");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node.isArray()).isTrue();
        ArrayNode records = (ArrayNode) node;
        assertThat(records).hasSize(2);

        result = get("/integration/reservations?start=" + filter + "&roomId=10");
        assertThat(result.status()).isEqualTo(200);
        node = Json.parse(contentAsString(result));
        assertThat(node.isArray()).isTrue();
        records = (ArrayNode) node;
        assertThat(records).isEmpty();
    }

    @Test
    public void testGetRooms() {
        Result result = get("/integration/rooms");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node.isArray()).isTrue();
        ArrayNode records = (ArrayNode) node;
        assertThat(records).hasSize(1);
    }

    @Test
    public void getRoomOpeningHours() {
        ExamRoom room = Ebean.find(ExamRoom.class, 1L);
        ExceptionWorkingHours ewh = new ExceptionWorkingHours();
        ewh.setStartDate(DateTime.now().withDayOfMonth(15).toDate());
        ewh.setEndDate(DateTime.now().plusMonths(1).withDayOfMonth(15).toDate());
        ewh.setStartDateTimezoneOffset(0);
        ewh.setEndDateTimezoneOffset(0);
        ExceptionWorkingHours ewh2 = new ExceptionWorkingHours();
        ewh2.setStartDate(DateTime.now().plusMonths(1).withDayOfMonth(1).toDate());
        ewh2.setEndDate(DateTime.now().plusMonths(1).withDayOfMonth(15).toDate());
        ewh2.setStartDateTimezoneOffset(0);
        ewh2.setEndDateTimezoneOffset(0);

        room.getCalendarExceptionEvents().add(ewh);
        room.getCalendarExceptionEvents().add(ewh2);
        room.update();

        String filter = DateTime.now().toString("yyyy-MM-dd");
        Result result = get("/integration/rooms/1/openinghours?date=" + filter);
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        ExamRoom examRoom = deserialize(ExamRoom.class, node);
        assertThat(examRoom.getCalendarExceptionEvents()).hasSize(1);
    }

}
