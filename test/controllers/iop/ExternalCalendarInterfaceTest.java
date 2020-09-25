package controllers.iop;

import backend.models.AutoEvaluationConfig;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamMachine;
import backend.models.ExamRoom;
import backend.models.GeneralSettings;
import backend.models.GradeEvaluation;
import backend.models.Language;
import backend.models.Reservation;
import backend.models.Role;
import backend.models.User;
import backend.models.iop.ExternalReservation;
import backend.models.json.ExternalExam;
import backend.util.json.JsonDeserializer;
import base.IntegrationTestCase;
import base.RunAsAdmin;
import base.RunAsStudent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.icegreen.greenmail.junit.GreenMailRule;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetup;
import com.typesafe.config.ConfigFactory;
import helpers.AttachmentServlet;
import helpers.RemoteServerHelper;
import io.ebean.Ebean;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.mail.internet.MimeMessage;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.io.IOUtils;
import org.eclipse.jetty.server.Server;
import static org.fest.assertions.Assertions.assertThat;
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

    public static class EnrolmentServlet extends HttpServlet {

        @Override
        protected void doGet(HttpServletRequest request, HttpServletResponse response) {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_OK);

            File file = new File("test/resources/enrolment.json");
            try (FileInputStream fis = new FileInputStream(file); ServletOutputStream sos = response.getOutputStream()) {
                IOUtils.copy(fis, sos);
                sos.flush();
            } catch (IOException e) {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        }
    }

    @BeforeClass
    public static void startServer() throws Exception {
        String baseUrl = String.format("/api/organisations/%s/facilities/%s", ORG_REF, ROOM_REF);
        // Check this shit
        String baseUrl2 = String.format("/api/organisations/test-org/facilities/%s", ROOM_REF);
        server = RemoteServerHelper.createAndStartServer(31247,
                Map.of(
                        SlotServlet.class, List.of(String.format("%s/slots", baseUrl)),
                        ReservationServlet.class, List.of(String.format("%s/reservations", baseUrl)),
                        ReservationRemovalServlet.class, List.of(
                                String.format("%s/reservations/%s", baseUrl, RESERVATION_REF),
                                String.format("%s/reservations/%s/force", baseUrl2, RESERVATION_REF)
                        ),
                        EnrolmentServlet.class, List.of(String.format("/api/enrolments/%s", RESERVATION_REF)),
                        AttachmentServlet.class, List.of("/api/attachments/*")
                )
        );
    }

    private void initialize(User other) {
        Ebean.deleteAll(Ebean.find(ExamEnrolment.class).findList());
        exam = Ebean.find(Exam.class).fetch("examSections").fetch("examSections.sectionQuestions").where().idEq(1L).findOne();
        initExamSectionQuestions(exam);
        exam.setExamActiveStartDate(DateTime.now().minusDays(1));
        exam.setExamActiveEndDate(DateTime.now().plusDays(1));
        exam.update();

        Long id = other == null ? userId : other.getId();

        if (id != null) {
            user = Ebean.find(User.class, id);
            user.setLanguage(Ebean.find(Language.class, "en"));
            user.update();
        }

        room = Ebean.find(ExamRoom.class, 1L);
        room.setExternalRef(ROOM_REF);
        room.getExamMachines().get(0).setIpAddress("127.0.0.1");
        room.getExamMachines().get(0).update();
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
    public void testGetSlots() {
        initialize(null);
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
    public void testGetSlotsWithConflictingReservation() {
        // Setup a conflicting reservation
        initialize(null);
        Exam exam2 = Ebean.find(Exam.class).where().eq("state", Exam.State.PUBLISHED).findList().get(1);
        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setStartAt(DateTime.now().plusMinutes(90));
        reservation.setEndAt(DateTime.now().plusHours(2));
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
    public void testProvideSlots() {
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
    public void testProvideReservation() {
        room = Ebean.find(ExamRoom.class, 1L);
        room.setExternalRef(ROOM_REF);
        room.update();

        DateTime start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1);
        DateTime end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2);

        Result result = request(Helpers.POST, "/integration/iop/reservations", Json.newObject()
                .put("id", RESERVATION_REF)
                .put("roomId", ROOM_REF)
                .put("start", ISODateTimeFormat.dateTime().print(start))
                .put("end", ISODateTimeFormat.dateTime().print(end))
                .put("user", "studentone@uni.org"));
        assertThat(result.status()).isEqualTo(201);
        Reservation reservation = Ebean.find(Reservation.class).where().eq("externalRef", RESERVATION_REF).findOne();
        assertThat(reservation).isNotNull();
        assertThat(reservation.getMachine().getRoom().getExternalRef()).isEqualTo(ROOM_REF);
        assertThat(reservation.getStartAt()).isEqualTo(start);
        assertThat(reservation.getEndAt()).isEqualTo(end);
    }

    @Test
    public void testAcknowledgeReservationRemoval() {
        room = Ebean.find(ExamRoom.class, 1L);
        room.setExternalRef(ROOM_REF);
        room.update();

        Reservation reservation = new Reservation();
        reservation.setExternalRef(RESERVATION_REF);
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();

        Result result = request(Helpers.DELETE, "/integration/iop/reservations/" + RESERVATION_REF, null);
        assertThat(result.status()).isEqualTo(200);
        Reservation removed = Ebean.find(Reservation.class).where().eq("externalRef", RESERVATION_REF).findOne();
        assertThat(removed).isNull();
    }

    @Test
    public void testAcknowledgeReservationRevocation() {
        initialize(null);

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
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

        Result result = request(Helpers.DELETE, "/integration/iop/reservations/" + RESERVATION_REF +
                "/force", null);
        assertThat(result.status()).isEqualTo(200);

        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation()).isNull();
        assertThat(Ebean.find(Reservation.class, reservation.getId())).isNull();
    }

    @Test
    public void testAcknowledgeReservationRevocationInEffectFails() {
        initialize(null);

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setStartAt(DateTime.now().minusHours(1));
        reservation.setEndAt(DateTime.now().plusHours(2));
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

        Result result = request(Helpers.DELETE, "/integration/iop/reservations/" + RESERVATION_REF +
                "/force", null);
        assertThat(result.status()).isEqualTo(403);

        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation()).isNotNull();
    }

    @Test
    @RunAsAdmin
    public void testRequestReservationRevocation() {
        room = Ebean.find(ExamRoom.class, 1L);
        room.setExternalRef(ROOM_REF);
        room.update();

        Reservation reservation = new Reservation();
        reservation.setExternalRef(RESERVATION_REF);
        reservation.setExternalUserRef("testuser@test.org");
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
        reservation.setMachine(room.getExamMachines().get(0));

        reservation.save();

        Result result = request(Helpers.DELETE,
                "/integration/iop/reservations/external/" + RESERVATION_REF + "/force",
                Json.newObject().put("msg", "msg"));
        assertThat(result.status()).isEqualTo(200);
        Reservation removed = Ebean.find(Reservation.class).where().eq("externalRef", RESERVATION_REF).findOne();
        assertThat(removed).isNull();
    }

    @Test
    @RunAsAdmin
    public void testDeleteProvidedReservationInProgressFails() {
        room = Ebean.find(ExamRoom.class, 1L);
        room.setExternalRef(ROOM_REF);
        room.update();

        Reservation reservation = new Reservation();
        reservation.setExternalRef(RESERVATION_REF);
        reservation.setStartAt(DateTime.now().minusHours(1));
        reservation.setEndAt(DateTime.now().plusHours(2));
        reservation.setMachine(room.getExamMachines().get(0));

        reservation.save();

        Result result = request(Helpers.DELETE,
                "/integration/iop/reservations/external/" + RESERVATION_REF + "/force",
                Json.newObject().put("msg", "msg"));
        assertThat(result.status()).isEqualTo(403);
        Reservation removed = Ebean.find(Reservation.class).where().eq("externalRef", RESERVATION_REF).findOne();
        assertThat(removed).isNotNull();
    }

    private void setAutoEvaluationConfig() {
        AutoEvaluationConfig config = new AutoEvaluationConfig();
        config.setReleaseType(AutoEvaluationConfig.ReleaseType.IMMEDIATE);
        config.setGradeEvaluations(new HashSet<>());
        exam.getGradeScale().getGrades().forEach(g -> {
            GradeEvaluation ge = new GradeEvaluation();
            ge.setGrade(g);
            ge.setPercentage(20 * Integer.parseInt(g.getName()));
            config.getGradeEvaluations().add(ge);
        });
        config.setExam(exam);
        config.save();
    }

    @Test
    public void testProvideEnrolment() {
        initialize(Ebean.find(User.class, 1));
        setAutoEvaluationConfig();
        Reservation reservation = new Reservation();
        reservation.setExternalRef(RESERVATION_REF);
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();

        enrolment.setReservation(reservation);
        enrolment.update();

        Result result = get("/integration/iop/reservations/" + RESERVATION_REF);
        assertThat(result.status()).isEqualTo(200);
        JsonNode body = Json.parse(contentAsString(result));
        Exam ee = deserialize(Exam.class, body);
        assertThat(ee.getId()).isEqualTo(exam.getId());
        assertThat(ee.getExamSections()).hasSize(exam.getExamSections().size());
        assertThat(
                ee.getExamSections().stream().mapToLong(es -> es.getSectionQuestions().size()).sum()).isEqualTo(
                exam.getExamSections().stream().mapToLong(es -> es.getSectionQuestions().size()).sum()
        );
    }

    @Test
    public void testLoginAsTemporalStudentVisitor() throws Exception {
        initialize(null);
        String eppn = "newuser@test.org";
        assertThat(user).isNull();

        Reservation reservation = new Reservation();
        reservation.setExternalUserRef(eppn);
        reservation.setExternalRef(RESERVATION_REF);
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();

        login(eppn);

        User newUser = Ebean.find(User.class).where().eq("eppn", eppn).findOne();
        assertThat(newUser).isNotNull();
        assertThat(newUser.getRoles()).hasSize(1);
        assertThat(newUser.getRoles().get(0).getName()).isEqualTo(Role.Name.TEACHER.toString());

        reservation = Ebean.find(Reservation.class).where().eq("externalRef", RESERVATION_REF).findOne();
        assertThat(reservation.getUser().getId()).isEqualTo(newUser.getId());

        // See that user is eventually directed to waiting room
        Result result = get("/app/checkSession");
        assertThat(result.headers().containsKey("x-exam-upcoming-exam")).isTrue();

        // Try do some teacher stuff, see that it is not allowed
        result = get("/app/reviewerexams");
        assertThat(result.status()).isEqualTo(403);

        // see that enrolment was created for the user
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where().eq("reservation.externalRef",
                RESERVATION_REF).findOne();
        assertThat(enrolment).isNotNull();
        assertThat(enrolment.getExam()).isNull();
        assertThat(enrolment.getExternalExam()).isNotNull();
        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(enrolment.getExternalExam().getContent());
        JsonNode node = mapper.readTree(json);
        Exam parsedExam = JsonDeserializer.deserialize(Exam.class, node);
        assertThat(parsedExam.getId()).isEqualTo(13630); // ID that is in enrolment.json
    }

    @Test
    public void testLoginAsTemporalStudentVisitorWrongMachine() throws Exception {
        initialize(null);
        String eppn = "newuser@test.org";
        assertThat(user).isNull();

        ExamMachine machine = room.getExamMachines().get(0);
        machine.setIpAddress("128.0.0.2");
        machine.update();
        Reservation reservation = new Reservation();
        reservation.setExternalUserRef(eppn);
        reservation.setExternalRef(RESERVATION_REF);
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();

        login(eppn);

        // See that user is informed of wrong ip
        Result result = get("/app/checkSession");
        assertThat(result.headers().containsKey("x-exam-unknown-machine")).isTrue();
    }

    @Test
    @RunAsStudent
    public void testRequestReservation() throws Exception {
        initialize(null);

        ObjectNode json = Json.newObject();
        json.put("start", ISODateTimeFormat.dateTime().print(DateTime.now().plusHours(1)));
        json.put("end", ISODateTimeFormat.dateTime().print(DateTime.now().plusHours(2)));
        json.put("examId", exam.getId());
        json.put("orgId", ORG_REF);
        json.put("roomId", ROOM_REF);
        json.put("requestingOrg", "foobar");
        json.set("sectionIds", Json.newArray().add(1));

        Result result = request(Helpers.POST, "/integration/iop/reservations/external", json);
        assertThat(result.status()).isEqualTo(201);

        JsonNode body = Json.parse(contentAsString(result));
        assertThat(body.asText()).isEqualTo(RESERVATION_REF);

        Reservation created = Ebean.find(Reservation.class).where().eq("externalRef", RESERVATION_REF).findOne();
        assertThat(created).isNotNull();
        assertThat(created.getOptionalSections()).hasSize(1);
        ExternalReservation external = created.getExternalReservation();
        assertThat(external).isNotNull();
        assertThat(external.getRoomInstructionEN()).isEqualTo("information in English here");
        assertThat(external.getMailAddress().getCity()).isEqualTo("Paris");


        // Check that correct mail was sent
        assertThat(greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1)).isTrue();
        MimeMessage[] mails = greenMail.getReceivedMessages();
        assertThat(mails).hasSize(1);
        assertThat(mails[0].getFrom()[0].toString()).contains(ConfigFactory.load().getString("sitnet.email.system.account"));
        String mailBody = GreenMailUtil.getBody(mails[0]);
        assertThat(mailBody).contains("You have booked an exam time");
        assertThat(mailBody).contains("Room 1");
    }

    @Test
    @RunAsStudent
    public void testRequestReservationPreviousInEffect() {
        // Setup
        initialize(null);

        DateTime start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1);
        DateTime end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2);

        Reservation reservation = new Reservation();
        reservation.setStartAt(DateTime.now().minusMinutes(10));
        reservation.setEndAt(DateTime.now().plusMinutes(10));
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.update();

        ObjectNode json = Json.newObject();
        json.put("start", ISODateTimeFormat.dateTime().print(start));
        json.put("end", ISODateTimeFormat.dateTime().print(end));
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
    public void testRequestReservationPreviousInTheFuture() {
        // Setup
        initialize(null);

        DateTime start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(6);
        DateTime end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(7);

        Reservation reservation = new Reservation();
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
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

        ObjectNode json = Json.newObject();
        json.put("start", ISODateTimeFormat.dateTime().print(start));
        json.put("end", ISODateTimeFormat.dateTime().print(end));
        json.put("examId", exam.getId());
        json.put("orgId", ORG_REF);
        json.put("roomId", ROOM_REF);
        Result result = request(Helpers.POST, "/integration/iop/reservations/external", json);

        assertThat(result.status()).isEqualTo(201);
        assertThat(contentAsString(result).equals("sitnet_error_enrolment_not_found"));

        // Verify
        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation().getId()).isNotEqualTo(reservation.getId());
        assertThat(Ebean.find(Reservation.class, reservation.getId())).isNull();

        greenMail.waitForIncomingEmail(5000, 1);
    }


    @Test
    @RunAsStudent
    public void testRequestReservationRemoval() throws Exception {
        initialize(null);

        Reservation reservation = new Reservation();
        reservation.setUser(user);
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
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
        assertThat(greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1)).isTrue();
        MimeMessage[] mails = greenMail.getReceivedMessages();
        assertThat(mails).hasSize(1);
        assertThat(mails[0].getFrom()[0].toString()).contains(ConfigFactory.load().getString("sitnet.email.system.account"));
        String mailBody = GreenMailUtil.getBody(mails[0]);
        assertThat(mailBody).contains("External Room R1");
    }

    @Test
    public void testRequestReservationRemovalAfterRemoteLogin() throws Exception {
        initialize(null);
        String eppn = "newuser@test.org";
        assertThat(user).isNull();

        Reservation reservation = new Reservation();
        reservation.setExternalUserRef(eppn);
        reservation.setExternalRef(RESERVATION_REF);
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();

        login(eppn);
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where().eq("reservation.externalRef",
                RESERVATION_REF).findOne();
        logout();

        Result result = request(Helpers.DELETE, "/integration/iop/reservations/" + RESERVATION_REF, null);
        assertThat(result.status()).isEqualTo(200);

        assertThat(Ebean.find(Reservation.class, reservation.getId())).isNull();
        assertThat(Ebean.find(ExamEnrolment.class, enrolment.getId())).isNull();
        assertThat(Ebean.find(ExternalExam.class, enrolment.getExternalExam().getId())).isNull();

    }


}
