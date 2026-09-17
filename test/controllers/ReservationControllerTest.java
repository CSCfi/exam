// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import base.IntegrationTestCase;
import base.RunAsAdmin;
import com.fasterxml.jackson.databind.JsonNode;
import com.icegreen.greenmail.configuration.GreenMailConfiguration;
import com.icegreen.greenmail.junit4.GreenMailRule;
import com.icegreen.greenmail.util.ServerSetupTest;
import io.ebean.DB;
import java.util.Arrays;
import java.util.List;
import miscellaneous.datetime.DateTimeHandler;
import models.calendar.DefaultWorkingHours;
import models.enrolment.ExamEnrolment;
import models.enrolment.Reservation;
import models.exam.Exam;
import models.facility.ExamMachine;
import models.facility.ExamRoom;
import models.user.User;
import org.joda.time.DateTime;
import org.joda.time.DateTimeUtils;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.ISODateTimeFormat;
import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.test.Helpers;

public class ReservationControllerTest extends IntegrationTestCase {

    @Rule
    public final GreenMailRule greenMail = new GreenMailRule(ServerSetupTest.SMTP).withConfiguration(
        new GreenMailConfiguration().withDisabledAuthentication()
    );

    // Anchored to a summer day at 12:15, so that a reservation can have started a moment ago and the
    // room still has later slots to offer. Off the hour, so that "the next slot" is never ambiguous,
    // and inside DST for the room's timezone, so that the times have to be normalized for display.
    private final DateTime fixedNow = DateTime.now().withMonthOfYear(7).withDayOfMonth(15).withTime(12, 15, 0, 0);

    private ExamRoom room;
    private Reservation reservation;
    private ExamMachine anotherMachine;

    private void setWorkingHours() {
        String[] days = { "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY" };
        Arrays.stream(days).forEach(d -> {
            DefaultWorkingHours dwh = new DefaultWorkingHours();
            dwh.setWeekday(d);
            dwh.setRoom(room);
            dwh.setStartTime(fixedNow.withTimeAtStartOfDay());
            dwh.setEndTime(dwh.getStartTime().withTime(20, 59, 59, 999));
            dwh.setTimezoneOffset(7200000);
            dwh.save();
        });
    }

    @Override
    @Before
    public void setUp() throws Exception {
        DateTimeUtils.setCurrentMillisFixed(fixedNow.getMillis());
        super.setUp();
        DB.deleteAll(DB.find(ExamEnrolment.class).findList());
        Exam exam = DB.find(Exam.class).where().eq("state", Exam.State.PUBLISHED).findList().get(0);
        exam.setDuration(60);
        exam.getSoftwareInfo().clear();
        exam.update();

        User student = DB.find(User.class).where().eq("eppn", "student@funet.fi").findOne();
        room = DB.find(ExamRoom.class, 1L);
        room.setLocalTimezone("Europe/Helsinki");
        room.update();
        setWorkingHours();

        List<ExamMachine> machines = room
            .getExamMachines()
            .stream()
            .filter(m -> !m.getOutOfService())
            .toList();
        assertThat(machines).hasSize(2);
        anotherMachine = machines.get(1);

        // Started half an hour ago, so mid-exam from the admin's point of view
        reservation = new Reservation();
        reservation.setUser(student);
        reservation.setMachine(machines.get(0));
        reservation.setStartAt(fixedNow.minusMinutes(30));
        reservation.setEndAt(reservation.getStartAt().plusMinutes(exam.getDuration()));
        reservation.save();

        ExamEnrolment enrolment = new ExamEnrolment();
        enrolment.setExam(exam);
        enrolment.setUser(student);
        enrolment.setReservation(reservation);
        enrolment.save();
    }

    @Override
    @After
    public void tearDown() {
        DateTimeUtils.setCurrentMillisSystem();
        super.tearDown();
    }

    private JsonNode availableMachines() {
        Result result = get("/app/reservations/" + reservation.getId() + "/" + room.getId() + "/machines");
        assertThat(result.status()).isEqualTo(Http.Status.OK);
        return Json.parse(contentAsString(result));
    }

    private Result changeMachine(JsonNode slot) {
        var body = Json.newObject().put("machineId", anotherMachine.getId());
        if (slot != null) {
            body.put("start", slot.get("start").asText()).put("end", slot.get("end").asText());
        }
        return request(Helpers.PUT, "/app/reservations/" + reservation.getId() + "/machine", body);
    }

    private String asLocalTime(DateTime dateTime) {
        DateTimeZone dtz = DateTimeZone.forID(room.getLocalTimezone());
        DateTimeHandler dateTimeHandler = app.injector().instanceOf(DateTimeHandler.class);
        return DateTimeFormat.forPattern("HH:mm").withZone(dtz).print(dateTimeHandler.normalize(dateTime, dtz));
    }

    private DateTime parse(JsonNode slot, String field) {
        return ISODateTimeFormat.dateTimeParser().parseDateTime(slot.get(field).asText());
    }

    @Test
    @RunAsAdmin
    public void testOngoingReservationIsOfferedItsOwnTimeAndTheNextSlot() {
        JsonNode node = availableMachines();
        assertThat(node.size()).isEqualTo(1);
        JsonNode slots = node.get(0).get("slots");
        assertThat(slots.size()).isEqualTo(2);

        // The ongoing time comes first
        JsonNode ongoing = slots.get(0);
        assertThat(parse(ongoing, "start").getMillis()).isEqualTo(reservation.getStartAt().getMillis());
        assertThat(parse(ongoing, "end").getMillis()).isEqualTo(reservation.getEndAt().getMillis());
        assertThat(ongoing.get("startAt").asText()).isEqualTo(asLocalTime(reservation.getStartAt()));
        assertThat(ongoing.get("endAt").asText()).isEqualTo(asLocalTime(reservation.getEndAt()));

        // Followed by the next slot the room can offer. It is an alternative to the ongoing time,
        // not a booking after it, so it may well start before the ongoing one ends
        JsonNode next = slots.get(1);
        assertThat(parse(next, "start").isAfter(parse(ongoing, "start"))).isTrue();
        assertThat(next.get("startAt").asText()).isEqualTo(asLocalTime(parse(next, "start")));
    }

    @Test
    @RunAsAdmin
    public void testPickingTheOngoingSlotKeepsOriginalTime() {
        DateTime originalStart = reservation.getStartAt();
        DateTime originalEnd = reservation.getEndAt();
        JsonNode ongoing = availableMachines().get(0).get("slots").get(0);

        assertThat(changeMachine(ongoing).status()).isEqualTo(Http.Status.OK);

        Reservation updated = DB.find(Reservation.class, reservation.getId());
        assertThat(updated.getMachine().getId()).isEqualTo(anotherMachine.getId());
        assertThat(updated.getStartAt().getMillis()).isEqualTo(originalStart.getMillis());
        assertThat(updated.getEndAt().getMillis()).isEqualTo(originalEnd.getMillis());
    }

    @Test
    @RunAsAdmin
    public void testPickingTheNextSlotMovesReservation() {
        JsonNode next = availableMachines().get(0).get("slots").get(1);

        assertThat(changeMachine(next).status()).isEqualTo(Http.Status.OK);

        Reservation updated = DB.find(Reservation.class, reservation.getId());
        assertThat(updated.getMachine().getId()).isEqualTo(anotherMachine.getId());
        assertThat(updated.getStartAt().getMillis()).isEqualTo(parse(next, "start").getMillis());
        assertThat(updated.getEndAt().getMillis()).isEqualTo(parse(next, "end").getMillis());
    }

    @Test
    @RunAsAdmin
    public void testSlotThatWasNotOfferedIsRejected() {
        var slot = Json.newObject()
            .put("start", ISODateTimeFormat.dateTime().print(fixedNow.plusDays(3)))
            .put("end", ISODateTimeFormat.dateTime().print(fixedNow.plusDays(3).plusHours(1)));

        assertThat(changeMachine(slot).status()).isEqualTo(Http.Status.FORBIDDEN);

        Reservation updated = DB.find(Reservation.class, reservation.getId());
        assertThat(updated.getMachine().getId()).isEqualTo(reservation.getMachine().getId());
    }

    @Test
    @RunAsAdmin
    public void testMachineChangeWithoutSlotKeepsOriginalTime() {
        DateTime originalStart = reservation.getStartAt();

        assertThat(changeMachine(null).status()).isEqualTo(Http.Status.OK);

        Reservation updated = DB.find(Reservation.class, reservation.getId());
        assertThat(updated.getMachine().getId()).isEqualTo(anotherMachine.getId());
        assertThat(updated.getStartAt().getMillis()).isEqualTo(originalStart.getMillis());
    }
}
