package controllers.iop;

import base.IntegrationTestCase;
import base.RunAsStudent;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import helpers.RemoteServerHelper;
import models.Exam;
import models.ExamEnrolment;
import models.ExamRoom;
import models.GeneralSettings;
import models.Reservation;
import models.User;
import org.eclipse.jetty.server.Server;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

public class ExternalCalendarInterfaceTest extends IntegrationTestCase {

    private static final String ORG_REF = "thisissomeorgref";
    private static final String ROOM_REF = "0e6d16c51f857a20ab578f57f1018456";

    private static Server server;
    private Exam exam;
    private User user;

    private ExamRoom room;
    private ExamEnrolment enrolment;

    public static class XmServlet extends HttpServlet {

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
            RemoteServerHelper.writeJsonResponse(response, an);
        }
    }

    @BeforeClass
    public static void startServer() throws Exception {
        server = RemoteServerHelper.createAndStartServer(31247, XmServlet.class,
                String.format("/api/organisations/%s/facilities/%s/slots", ORG_REF, ROOM_REF));
    }

    @Before
    @Override
    public void setUp() throws Exception {
        super.setUp();
        Ebean.deleteAll(Ebean.find(ExamEnrolment.class).findList());
        exam = Ebean.find(Exam.class).where().eq("state", Exam.State.PUBLISHED).findList().get(0);
        exam.setExamActiveStartDate(DateTime.now().minusDays(1).toDate());
        exam.setExamActiveEndDate(DateTime.now().plusDays(1).toDate());
        exam.update();
        user = Ebean.find(User.class, userId);
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
        String url = String.format("/integration/iop/calendar?examId=%d&org=%s&roomId=%s&date=%s",
                exam.getId(), ORG_REF, room.getExternalRef(), ISODateTimeFormat.date().print(LocalDate.now()));
        Result result = get(url);
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(2);
        ArrayNode an = (ArrayNode)node;
        assertThat(an.get(0).get("availableMachines").asInt()).isEqualTo(4);
        assertThat(an.get(1).get("availableMachines").asInt()).isEqualTo(7);
    }

    @Test
    @RunAsStudent
    public void testGetSlotsWithConflictingReservation() throws Exception {
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

        String url = String.format("/integration/iop/calendar?examId=%d&org=%s&roomId=%s&date=%s",
                exam.getId(), ORG_REF, room.getExternalRef(), ISODateTimeFormat.date().print(LocalDate.now()));
        Result result = get(url);
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(2);
        ArrayNode an = (ArrayNode)node;
        assertThat(an.get(0).get("availableMachines").asInt()).isEqualTo(-1);
        assertThat(an.get(0).get("conflictingExam").asText()).isEqualTo(exam2.getName());
        assertThat(an.get(1).get("availableMachines").asInt()).isEqualTo(7);
    }

}
