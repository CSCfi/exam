package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import models.Exam;
import org.apache.commons.io.IOUtils;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletHandler;
import org.joda.time.DateTime;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;
import static play.test.Helpers.status;

public class PermissionCheckInterfaceTest extends IntegrationTestCase {

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

    @Before
    @Override
    public void setUp() throws Exception {
        super.setUp();
        // Fake API shall return a course with code 810136P. Lets make a referenced exam active in the DB so it should
        // pop up in the search results
        Exam exam = Ebean.find(Exam.class).where()
                .eq("course.code", "810136P")
                .eq("state", Exam.State.PUBLISHED.toString()).findUnique();
        exam.setExamActiveStartDate(DateTime.now().minusDays(1).toDate());
        exam.setExamActiveEndDate(DateTime.now().plusDays(1).toDate());
        exam.save();
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        server.stop();
    }

    @Test
    @RunAsStudent
    public void testListExams() throws Exception {
        Result result = get("/student/exams");
        assertThat(status(result)).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(1);
        Exam exam = deserialize(Exam.class, node.get(0));
        assertThat(exam.getCourse().getCode()).isEqualTo("810136P");
    }

}
