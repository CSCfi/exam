package controllers.iop;

import base.IntegrationTestCase;
import base.RunAsStudent;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.collect.ImmutableMap;
import com.icegreen.greenmail.junit.GreenMailRule;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetup;
import com.typesafe.config.ConfigFactory;
import helpers.RemoteServerHelper;
import models.Exam;
import models.ExamEnrolment;
import models.ExamRoom;
import models.GeneralSettings;
import models.Language;
import models.Reservation;
import models.User;
import models.iop.ExternalReservation;
import org.eclipse.jetty.server.Server;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Rule;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

import javax.mail.internet.MimeMessage;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Date;
import java.util.stream.Collectors;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

public class ExternalCalendarInterfaceTest extends IntegrationTestCase {

    private static final String ORG_REF = "thisissomeorgref";
    private static final String ROOM_REF = "0e6d16c51f857a20ab578f57f1018456";
    private static final String RESERVATION_REF = "0e6d16c51f857a20ab578f57f105032e";

    private static Server server;
    private Exam exam;
    private User user;

    private ExamRoom room;
    private ExamEnrolment enrolment;

    @Rule
    public final GreenMailRule greenMail = new GreenMailRule(new ServerSetup(11465, null, ServerSetup.PROTOCOL_SMTP));

    public static class SlotServlet extends HttpServlet {

        @Override
        protected void doGet(HttpServletRequest request, HttpServletResponse response) {
            ArrayNode an = Json.newArray();
            ObjectNode slot1 = Json.newObject();
            ObjectNode slot2 = Json.newObject();
            DateTime soon = DateTime.now().plusHours(1);
            slot1.put("start", ISODateTimeFormat.dateTime().print(soon));
            slot1.put("end", ISODateTimeFormat.dateTime().print(soon.plusHours(1)));
            slot1.put("availableMachines", 4);
            slot2.put("start", ISODateTimeFormat.dateTime().print(soon.plusHours(2)));
            slot2.put("end", ISODateTimeFormat.dateTime().print(soon.plusHours(3)));
            slot2.put("availableMachines", 7);
            an.add(slot1);
            an.add(slot2);
            RemoteServerHelper.writeJsonResponse(response, an, HttpServletResponse.SC_OK);
        }
    }


    public static class ReservationServlet extends HttpServlet {

        @Override
        protected void doPost(HttpServletRequest request, HttpServletResponse response) {
            ObjectNode reservation = Json.newObject();
            DateTime soon = DateTime.now().plusHours(1);
            reservation.put("start", ISODateTimeFormat.dateTime().print(soon));
            reservation.put("end", ISODateTimeFormat.dateTime().print(soon.plusHours(1)));
            reservation.put("id", RESERVATION_REF);
            reservation.put("externalUserRef", "user1@uni.org");
            ObjectNode machine = Json.newObject();
            machine.put("name", "Machine 1");
            ObjectNode room = Json.newObject();
            room.put("name", "Room 1");
            room.put("roomCode", "R1");
            room.put("localTimezone", "Europe/Helsinki");
            room.put("roomInstructionEN", "information in English here");
            room.put("buildingName", "B1");
            ObjectNode addressNode = Json.newObject();
            addressNode.put("city", "Paris");
            addressNode.put("street", "123 Rue Monet");
            addressNode.put("zip", "1684");
            room.set("mailAddress", addressNode);
            machine.set("room", room);
            reservation.set("machine", machine);

            RemoteServerHelper.writeJsonResponse(response, reservation, HttpServletResponse.SC_CREATED);
        }

    }

    public static class ReservationRemovalServlet extends HttpServlet {

        @Override
        protected void doDelete(HttpServletRequest request, HttpServletResponse response) {
            RemoteServerHelper.writeEmptyJsonResponse(response);
        }
    }

    @BeforeClass
    public static void startServer() throws Exception {
        String baseUrl = String.format("/api/organisations/%s/facilities/%s", ORG_REF, ROOM_REF);
        server = RemoteServerHelper.createAndStartServer(31247,
                ImmutableMap.of(
                        SlotServlet.class, String.format("%s/slots", baseUrl),
                        ReservationServlet.class, String.format("%s/reservations", baseUrl),
                        ReservationRemovalServlet.class, String.format("%s/reservations/%s", baseUrl, RESERVATION_REF)
                )
        );
    }

    private void initialize() throws Exception {
        Ebean.deleteAll(Ebean.find(ExamEnrolment.class).findList());
        exam = Ebean.find(Exam.class).where().eq("state", Exam.State.PUBLISHED).findList().get(0);
        exam.setExamActiveStartDate(DateTime.now().minusDays(1).toDate());
        exam.setExamActiveEndDate(DateTime.now().plusDays(1).toDate());
        exam.update();

        user = Ebean.find(User.class, userId);
        user.setLanguage(Ebean.find(Language.class, "en"));
        user.update();

        room = Ebean.find(ExamRoom.class, 1L);
        room.setExternalRef(ROOM_REF);
        room.update();

        enrolment = new ExamEnrolment();
        enrolment.setExam(exam);
        enrolment.setUser(user);
        enrolment.save();
        GeneralSettings gs = new GeneralSettings();
        gs.setName("reservation_window_size");
        gs.setValue("60");
        gs.setId(3l);
        gs.save();
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        RemoteServerHelper.shutdownServer(server);
    }

    @Test
    @RunAsStudent
    public void testGetSlots() throws Exception {
        initialize();
        String url = String.format("/integration/iop/calendar/%d/%s?&org=%s&date=%s",
                exam.getId(), room.getExternalRef(), ORG_REF, ISODateTimeFormat.date().print(LocalDate.now()));
        Result result = get(url);
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(2);
        ArrayNode an = (ArrayNode) node;
        assertThat(an.get(0).get("availableMachines").asInt()).isEqualTo(4);
        assertThat(an.get(1).get("availableMachines").asInt()).isEqualTo(7);
    }

    @Test
    @RunAsStudent
    public void testGetSlotsWithConflictingReservation() throws Exception {
        // Setup a conflicting reservation
        initialize();
        Exam exam2 = Ebean.find(Exam.class).where().eq("state", Exam.State.PUBLISHED).findList().get(1);
        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setStartAt(DateTime.now().plusMinutes(90).toDate());
        reservation.setEndAt(DateTime.now().plusHours(2).toDate());
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();
        ExamEnrolment enrolment2 = new ExamEnrolment();
        enrolment2.setExam(exam2);
        enrolment2.setUser(user);
        enrolment2.setReservation(reservation);
        enrolment2.save();

        // Execute
        String url = String.format("/integration/iop/calendar/%d/%s?&org=%s&date=%s",
                exam.getId(), room.getExternalRef(), ORG_REF, ISODateTimeFormat.date().print(LocalDate.now()));
        Result result = get(url);
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(2);
        ArrayNode an = (ArrayNode) node;

        // Ensure that first slot got marked as reserved (due conflicting reservation)
        assertThat(an.get(0).get("availableMachines").asInt()).isEqualTo(-1);
        assertThat(an.get(0).get("conflictingExam").asText()).isEqualTo(exam2.getName());
        assertThat(an.get(1).get("availableMachines").asInt()).isEqualTo(7);
    }

    @Test
    public void testProvideSlots() throws Exception {
        room = Ebean.find(ExamRoom.class, 1L);
        room.setExternalRef(ROOM_REF);
        room.update();
        int machineCount = room.getExamMachines().stream()
                .filter(em -> !em.getOutOfService())
                .collect(Collectors.toList())
                .size();

        GeneralSettings gs = new GeneralSettings();
        gs.setName("reservation_window_size");
        gs.setValue("60");
        gs.setId(3l);
        gs.save();

        String url = String.format("/integration/iop/slots?roomId=%s&date=%s&start=%s&end=%s&duration=%d",
                room.getExternalRef(),
                ISODateTimeFormat.date().print(LocalDate.now()),
                ISODateTimeFormat.dateTime().print(DateTime.now().minusDays(7)),
                ISODateTimeFormat.dateTime().print(DateTime.now().plusDays(7)),
                180);
        Result result = get(url);
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        ArrayNode an = (ArrayNode) node;
        // This could be empty if we ran this on a Sunday after 13 PM :)
        for (JsonNode slot : an) {
            assertThat(slot.get("availableMachines").asInt()).isEqualTo(machineCount);
            assertThat(slot.get("ownReservation").asBoolean()).isFalse();
            assertThat(slot.get("conflictingExam").isNull()).isTrue();
        }
    }

    @Test
    public void testProvideReservation() throws Exception {
        room = Ebean.find(ExamRoom.class, 1L);
        room.setExternalRef(ROOM_REF);
        room.update();

        Date start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1).toDate();
        Date end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2).toDate();

        Result result = request(Helpers.POST, "/integration/iop/reservations", Json.newObject()
                .put("id", RESERVATION_REF)
                .put("roomId", ROOM_REF)
                .put("start", ISODateTimeFormat.dateTime().print(start.getTime()))
                .put("end", ISODateTimeFormat.dateTime().print(end.getTime()))
                .put("user", "studentone@uni.org"));
        assertThat(result.status()).isEqualTo(201);
        Reservation reservation = Ebean.find(Reservation.class).where().eq("externalRef", RESERVATION_REF).findUnique();
        assertThat(reservation).isNotNull();
        assertThat(reservation.getMachine().getRoom().getExternalRef()).isEqualTo(ROOM_REF);
        assertThat(reservation.getStartAt()).isEqualTo(start);
        assertThat(reservation.getEndAt()).isEqualTo(end);
    }

    @Test
    public void testDeleteProvidedReservation() throws Exception {
        room = Ebean.find(ExamRoom.class, 1L);
        room.setExternalRef(ROOM_REF);
        room.update();

        Reservation reservation = new Reservation();
        reservation.setExternalRef(RESERVATION_REF);
        reservation.setStartAt(DateTime.now().plusHours(2).toDate());
        reservation.setEndAt(DateTime.now().plusHours(3).toDate());
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();

        Result result = request(Helpers.DELETE, "/integration/iop/reservations/" + RESERVATION_REF, null);
        assertThat(result.status()).isEqualTo(200);
        Reservation removed = Ebean.find(Reservation.class).where().eq("externalRef", RESERVATION_REF).findUnique();
        assertThat(removed).isNull();
    }

    @Test
    @RunAsStudent
    public void testRequestReservation() throws Exception {
        initialize();

        ObjectNode json = Json.newObject();
        json.put("start", ISODateTimeFormat.dateTime().print(DateTime.now().plusHours(1)));
        json.put("end", ISODateTimeFormat.dateTime().print(DateTime.now().plusHours(2)));
        json.put("examId", exam.getId());
        json.put("orgId", ORG_REF);
        json.put("roomId", ROOM_REF);

        Result result = request(Helpers.POST, "/integration/iop/reservations/external", json);
        assertThat(result.status()).isEqualTo(201);

        JsonNode body = Json.parse(contentAsString(result));
        assertThat(body.asText()).isEqualTo(RESERVATION_REF);

        Reservation created = Ebean.find(Reservation.class).where().eq("externalRef", RESERVATION_REF).findUnique();
        assertThat(created).isNotNull();

        // Check that correct mail was sent
        assertThat(greenMail.waitForIncomingEmail(1)).isTrue();
        MimeMessage[] mails = greenMail.getReceivedMessages();
        assertThat(mails).hasSize(1);
        assertThat(mails[0].getFrom()[0].toString()).contains(ConfigFactory.load().getString("sitnet.email.system.account"));
        String mailBody = GreenMailUtil.getBody(mails[0]);
        assertThat(mailBody).contains("You have booked an exam time");
        assertThat(mailBody).contains("information in English here");
        assertThat(mailBody).contains("Room 1");
        assertThat(GreenMailUtil.hasNonTextAttachments(mails[0])).isTrue();
    }

    @Test
    @RunAsStudent
    public void testRequestReservationPreviousInEffect() throws Exception {
        // Setup
        initialize();

        Date start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1).toDate();
        Date end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2).toDate();

        Reservation reservation = new Reservation();
        reservation.setStartAt(DateTime.now().minusMinutes(10).toDate());
        reservation.setEndAt(DateTime.now().plusMinutes(10).toDate());
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.update();

        ObjectNode json = Json.newObject();
        json.put("start", ISODateTimeFormat.dateTime().print(start.getTime()));
        json.put("end", ISODateTimeFormat.dateTime().print(end.getTime()));
        json.put("examId", exam.getId());
        json.put("orgId", ORG_REF);
        json.put("roomId", ROOM_REF);
        Result result = request(Helpers.POST, "/integration/iop/reservations/external", json);

        assertThat(result.status()).isEqualTo(403);
        assertThat(contentAsString(result).equals("sitnet_error_enrolment_not_found"));

        // Verify
        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation().getId()).isEqualTo(reservation.getId());
    }

    @Test
    @RunAsStudent
    public void testRequestReservationRemoval() throws Exception {
        initialize();

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setStartAt(DateTime.now().plusHours(2).toDate());
        reservation.setEndAt(DateTime.now().plusHours(3).toDate());
        reservation.setExternalRef(RESERVATION_REF);
        ExternalReservation er = new ExternalReservation();
        er.setOrgRef(ORG_REF);
        er.setRoomRef(ROOM_REF);
        er.setMachineName("M1");
        er.setRoomName("External Room R1");
        er.save();
        reservation.setExternalReservation(er);
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.update();

        Result result = request(Helpers.DELETE, "/integration/iop/reservations/external/" + RESERVATION_REF, null);
        assertThat(result.status()).isEqualTo(200);

        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation()).isNull();
        assertThat(Ebean.find(Reservation.class, reservation.getId())).isNull();

        // Check that correct mail was sent
        assertThat(greenMail.waitForIncomingEmail(1)).isTrue();
        MimeMessage[] mails = greenMail.getReceivedMessages();
        assertThat(mails).hasSize(1);
        assertThat(mails[0].getFrom()[0].toString()).contains(ConfigFactory.load().getString("sitnet.email.system.account"));
        String mailBody = GreenMailUtil.getBody(mails[0]);
        assertThat(mailBody).contains("External Room R1");
    }


}
