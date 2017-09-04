package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import com.fasterxml.jackson.databind.JsonNode;
import com.google.common.collect.ImmutableMap;
import com.google.common.io.Files;
import helpers.RemoteServerHelper;
import io.ebean.Ebean;
import io.ebean.text.json.EJson;
import models.Exam;
import models.ExamEnrolment;
import models.ExamMachine;
import models.ExamRoom;
import models.Reservation;
import models.User;
import models.json.ExternalExam;
import org.eclipse.jetty.server.Server;
import org.joda.time.DateTime;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;
import util.java.JsonDeserializer;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.nio.charset.Charset;
import java.util.List;
import java.util.UUID;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;


public class EnrolmentControllerTest extends IntegrationTestCase {

    private Exam exam;
    private User user;
    private ExamEnrolment enrolment;
    private Reservation reservation;
    private ExamRoom room;

    private static Server server;

    public static class CourseInfoServlet extends HttpServlet {

        @Override
        protected void doGet(HttpServletRequest request, HttpServletResponse response) {
            RemoteServerHelper.writeResponseFromFile(response, "test/resources/enrolments.json");
        }
    }

    @BeforeClass
    public static void startServer() throws Exception {
        server = RemoteServerHelper.createAndStartServer(31246, ImmutableMap.of(CourseInfoServlet.class, "/enrolments"));
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        RemoteServerHelper.shutdownServer(server);
    }

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();
        Ebean.deleteAll(Ebean.find(ExamEnrolment.class).findList());
        exam = Ebean.find(Exam.class, 1);
        user = Ebean.find(User.class, userId);
        enrolment = new ExamEnrolment();
        enrolment.setExam(exam);
        enrolment.setUser(user);
        reservation = new Reservation();
        reservation.setUser(user);
        room = Ebean.find(ExamRoom.class, 1L);
    }

    @Test
    @RunAsStudent
    public void testGetEnrolmentForExternalExam() throws Exception {
        ExternalExam ee = new ExternalExam();
        ee.setExternalRef(UUID.randomUUID().toString());
        ee.setHash(UUID.randomUUID().toString());
        ee.setCreated(DateTime.now());
        ee.setCreator(user);
        ee.setContent(EJson.parseObject(
                Files.asCharSource(new File("test/resources/enrolment.json"), Charset.forName("UTF-8")).read())
        );
        ExamMachine machine = room.getExamMachines().get(0);
        machine.setIpAddress("127.0.0.1");
        machine.update();
        reservation.setMachine(machine);
        reservation.setStartAt(DateTime.now().plusMinutes(30));
        reservation.setEndAt(DateTime.now().plusMinutes(75));
        reservation.setExternalUserRef(user.getEppn());
        reservation.setExternalRef("foobar");
        reservation.save();
        enrolment.setExternalExam(ee);
        enrolment.setExam(null);
        enrolment.setReservation(reservation);
        enrolment.save();

        Result result = get("/app/enrolments/" + enrolment.getId());
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        ExamEnrolment data = JsonDeserializer.deserialize(ExamEnrolment.class, node);
        assertThat(data.getExam()).isNotNull();
    }

    @Test
    @RunAsStudent
    public void testCreateEnrolment() throws Exception {
        // Execute
        Result result = request(Helpers.POST,
                String.format("/app/enroll/%s/exam/%d", exam.getCourse().getCode(), exam.getId()), null);
        assertThat(result.status()).isEqualTo(200);

        // Verify
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where().eq("exam.id", exam.getId())
                .eq("user.id", user.getId()).findUnique();
        assertThat(enrolment).isNotNull();
    }

    @Test
    @RunAsStudent
    public void testRecreateEnrolment() throws Exception {
        // Setup
        DateTime enrolledOn = DateTime.now();
        enrolment.setEnrolledOn(enrolledOn);
        enrolment.save();

        // Execute
        Result result = request(Helpers.POST,
                String.format("/app/enroll/%s/exam/%d", exam.getCourse().getCode(), exam.getId()), null);
        assertThat(result.status()).isEqualTo(403);
        assertThat(contentAsString(result)).isEqualTo("sitnet_error_enrolment_exists");

        // Verify
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class).findList();
        assertThat(enrolments).hasSize(1);
        enrolment = enrolments.get(0);
        assertThat(enrolment.getEnrolledOn()).isEqualTo(enrolledOn);
    }

    @Test
    @RunAsStudent
    public void testCreateEnrolmentFutureReservationExists() throws Exception {
        // Setup
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.setStartAt(DateTime.now().plusDays(1));
        reservation.setEndAt(DateTime.now().plusDays(2));
        reservation.save();

        DateTime enrolledOn = DateTime.now();
        enrolment.setEnrolledOn(enrolledOn);
        enrolment.setReservation(reservation);
        enrolment.save();

        // Execute
        Result result = request(Helpers.POST,
                String.format("/app/enroll/%s/exam/%d", exam.getCourse().getCode(), exam.getId()), null);
        assertThat(result.status()).isEqualTo(200);

        // Verify
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class).findList();
        assertThat(enrolments).hasSize(1);
        ExamEnrolment e = enrolments.get(0);
        assertThat(e.getEnrolledOn().isAfter(enrolledOn));
        assertThat(e.getReservation()).isNull();
    }

    @Test
    @RunAsStudent
    public void testCreateEnrolmentOngoingReservationExists() throws Exception {
        // Setup
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.setStartAt(DateTime.now().minusDays(1));
        reservation.setEndAt(DateTime.now().plusDays(1));
        reservation.save();

        DateTime enrolledOn = DateTime.now();
        enrolment.setEnrolledOn(enrolledOn);
        enrolment.setReservation(reservation);
        enrolment.save();

        // Execute
        Result result = request(Helpers.POST,
                String.format("/app/enroll/%s/exam/%d", exam.getCourse().getCode(), exam.getId()), null);
        assertThat(result.status()).isEqualTo(403); // Not found
        assertThat(contentAsString(result)).isEqualTo("sitnet_reservation_in_effect");

        // Verify
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class).findList();
        assertThat(enrolments).hasSize(1);
        ExamEnrolment e = enrolments.get(0);
        assertThat(e.getEnrolledOn()).isEqualTo(enrolledOn);
    }

    @Test
    @RunAsStudent
    public void testCreateEnrolmentPastReservationExists() throws Exception {
        // Setup
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.setStartAt(DateTime.now().minusDays(2));
        reservation.setEndAt(DateTime.now().minusDays(1));
        reservation.save();
        DateTime enrolledOn = DateTime.now();
        enrolment.setEnrolledOn(enrolledOn);
        enrolment.setReservation(reservation);
        enrolment.save();

        // Execute
        Result result = request(Helpers.POST,
                String.format("/app/enroll/%s/exam/%d", exam.getCourse().getCode(), exam.getId()), null);
        assertThat(result.status()).isEqualTo(200);

        // Verify
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class).findList();
        assertThat(enrolments).hasSize(2);
        ExamEnrolment e = enrolments.get(1);
        assertThat(e.getEnrolledOn().isAfter(enrolledOn));
        assertThat(e.getReservation()).isNull();
    }

}
