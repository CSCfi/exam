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
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormat;
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

    private ExamRoom room;
    private Reservation reservation;
    private ExamMachine anotherMachine;

    private void setWorkingHours() {
        String[] days = { "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY" };
        Arrays.stream(days).forEach(d -> {
            DefaultWorkingHours dwh = new DefaultWorkingHours();
            dwh.setWeekday(d);
            dwh.setRoom(room);
            dwh.setStartTime(DateTime.now().withTimeAtStartOfDay());
            dwh.setEndTime(dwh.getStartTime().withTime(20, 59, 59, 999));
            dwh.setTimezoneOffset(7200000);
            dwh.save();
        });
    }

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();
        DB.deleteAll(DB.find(ExamEnrolment.class).findList());
        Exam exam = DB.find(Exam.class).where().eq("state", Exam.State.PUBLISHED).findList().get(0);
        exam.setDuration(60);
        exam.getSoftwareInfo().clear();
        exam.update();

        User student = DB.find(User.class).where().eq("eppn", "student@funet.fi").findOne();
        room = DB.find(ExamRoom.class, 1L);
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
        reservation.setStartAt(DateTime.now().minusMinutes(30));
        reservation.setEndAt(reservation.getStartAt().plusMinutes(exam.getDuration()));
        reservation.save();

        ExamEnrolment enrolment = new ExamEnrolment();
        enrolment.setExam(exam);
        enrolment.setUser(student);
        enrolment.setReservation(reservation);
        enrolment.save();
    }

    private String asLocalTime(DateTime dateTime) {
        DateTimeZone dtz = DateTimeZone.forID(room.getLocalTimezone());
        DateTimeHandler dateTimeHandler = app.injector().instanceOf(DateTimeHandler.class);
        return DateTimeFormat.forPattern("HH:mm").withZone(dtz).print(dateTimeHandler.normalize(dateTime, dtz));
    }

    @Test
    @RunAsAdmin
    public void testOngoingReservationMachinesAreOfferedAtOriginalTime() {
        Result result = get("/app/reservations/" + reservation.getId() + "/" + room.getId() + "/machines");
        assertThat(result.status()).isEqualTo(Http.Status.OK);

        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node.size()).isEqualTo(1);
        assertThat(node.get(0).get("startAt").asText()).isEqualTo(asLocalTime(reservation.getStartAt()));
        assertThat(node.get(0).get("endAt").asText()).isEqualTo(asLocalTime(reservation.getEndAt()));
    }

    @Test
    @RunAsAdmin
    public void testChangingMachineOfOngoingReservationKeepsOriginalTime() {
        DateTime originalStart = reservation.getStartAt();
        DateTime originalEnd = reservation.getEndAt();

        Result result = request(
            Helpers.PUT,
            "/app/reservations/" + reservation.getId() + "/machine",
            Json.newObject().put("machineId", anotherMachine.getId())
        );
        assertThat(result.status()).isEqualTo(Http.Status.OK);

        Reservation updated = DB.find(Reservation.class, reservation.getId());
        assertThat(updated.getMachine().getId()).isEqualTo(anotherMachine.getId());
        assertThat(updated.getStartAt().getMillis()).isEqualTo(originalStart.getMillis());
        assertThat(updated.getEndAt().getMillis()).isEqualTo(originalEnd.getMillis());
    }
}
