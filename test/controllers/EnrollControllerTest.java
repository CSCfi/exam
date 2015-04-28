package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import com.avaje.ebean.Ebean;
import models.*;
import org.apache.commons.io.IOUtils;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletHandler;
import org.joda.time.DateTime;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import play.mvc.Result;
import play.test.Helpers;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Date;
import java.util.List;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;
import static play.test.Helpers.status;


public class EnrollControllerTest extends IntegrationTestCase {

    private Exam exam;
    private User user;
    private ExamEnrolment enrolment;
    private Reservation reservation;
    private ExamRoom room;

    private static Server server;

    public static class CourseInfoServlet extends HttpServlet {

        private File jsonFile = new File("test/resource/enrolments.json");

        @Override
        protected void doGet(HttpServletRequest request, HttpServletResponse response) {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_OK);
            try (FileInputStream fis = new FileInputStream(jsonFile); ServletOutputStream sos = response.getOutputStream()) {
                IOUtils.copy(fis, sos);
                sos.flush();
            } catch (IOException e) {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        }
    }

    @BeforeClass
    public static void startServer() throws Exception {
        server = new Server(31246);
        server.setStopAtShutdown(true);
        ServletHandler handler = new ServletHandler();
        handler.addServletWithMapping(CourseInfoServlet.class, "/enrolments");
        server.setHandler(handler);
        server.start();
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        server.stop();
    }

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();
        Ebean.delete(Ebean.find(ExamEnrolment.class).findList());
        exam = Ebean.find(Exam.class).where().eq("state", Exam.State.PUBLISHED.toString()).findList().get(0);
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
    public void testCreateEnrolment() throws Exception {
        // Execute
        Result result = request(Helpers.POST,
                String.format("/enroll/%s/exam/%d", exam.getCourse().getCode(), exam.getId()), null);
        assertThat(status(result)).isEqualTo(200);

        // Verify
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class).where().eq("exam.id", exam.getId())
                .eq("user.id", user.getId()).findUnique();
        assertThat(enrolment).isNotNull();
    }

    @Test
    @RunAsStudent
    public void testRecreateEnrolment() throws Exception {
        // Setup
        Date enrolledOn = new Date();
        enrolment.setEnrolledOn(enrolledOn);
        enrolment.save();

        // Execute
        Result result = request(Helpers.POST,
                String.format("/enroll/%s/exam/%d", exam.getCourse().getCode(), exam.getId()), null);
        assertThat(status(result)).isEqualTo(403);
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
        reservation.setStartAt(DateTime.now().plusDays(1).toDate());
        reservation.setEndAt(DateTime.now().plusDays(2).toDate());
        reservation.save();

        Date enrolledOn = new Date();
        enrolment.setEnrolledOn(enrolledOn);
        enrolment.setReservation(reservation);
        enrolment.save();

        // Execute
        Result result = request(Helpers.POST,
                String.format("/enroll/%s/exam/%d", exam.getCourse().getCode(), exam.getId()), null);
        assertThat(status(result)).isEqualTo(200);

        // Verify
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class).findList();
        assertThat(enrolments).hasSize(1);
        ExamEnrolment e = enrolments.get(0);
        assertThat(e.getEnrolledOn().after(enrolledOn));
        assertThat(e.getReservation()).isNull();
    }

    @Test
    @RunAsStudent
    public void testCreateEnrolmentOngoingReservationExists() throws Exception {
        // Setup
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.setStartAt(DateTime.now().minusDays(1).toDate());
        reservation.setEndAt(DateTime.now().plusDays(1).toDate());
        reservation.save();

        Date enrolledOn = new Date();
        enrolment.setEnrolledOn(enrolledOn);
        enrolment.setReservation(reservation);
        enrolment.save();

        // Execute
        Result result = request(Helpers.POST,
                String.format("/enroll/%s/exam/%d", exam.getCourse().getCode(), exam.getId()), null);
        assertThat(status(result)).isEqualTo(403); // Not found
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
        reservation.setStartAt(DateTime.now().minusDays(2).toDate());
        reservation.setEndAt(DateTime.now().minusDays(1).toDate());
        reservation.save();
        Date enrolledOn = new Date();
        enrolment.setEnrolledOn(enrolledOn);
        enrolment.setReservation(reservation);
        enrolment.save();

        // Execute
        Result result = request(Helpers.POST,
                String.format("/enroll/%s/exam/%d", exam.getCourse().getCode(), exam.getId()), null);
        assertThat(status(result)).isEqualTo(200);

        // Verify
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class).findList();
        assertThat(enrolments).hasSize(2);
        ExamEnrolment e = enrolments.get(1);
        assertThat(e.getEnrolledOn().after(enrolledOn));
        assertThat(e.getReservation()).isNull();
    }

}
