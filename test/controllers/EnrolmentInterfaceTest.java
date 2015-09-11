package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import helpers.RemoteServerHelper;
import models.Exam;
import org.eclipse.jetty.server.Server;
import org.joda.time.DateTime;
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

public class EnrolmentInterfaceTest extends IntegrationTestCase {

    private static Server server;
    static boolean emptyResponse;

    public static class CourseInfoServlet extends HttpServlet {

        @Override
        protected void doGet(HttpServletRequest request, HttpServletResponse response) {
            if (emptyResponse) {
                RemoteServerHelper.writeEmptyJsonResponse(response);
            } else {
                RemoteServerHelper.writeResponseFromFile(response, "test/resources/enrolments.json");
            }
        }
    }

    @BeforeClass
    public static void startServer() throws Exception {
        server = RemoteServerHelper.createAndStartServer(31246, CourseInfoServlet.class, "/enrolments");
    }

    @Before
    @Override
    public void setUp() throws Exception {
        super.setUp();
        // Fake API shall return a course with code 810136P. Lets make a referenced exam active in the DB so it should
        // pop up in the search results
        Exam exam = Ebean.find(Exam.class).where()
                .eq("course.code", "810136P")
                .eq("state", Exam.State.PUBLISHED).findUnique();
        exam.setExamActiveStartDate(DateTime.now().minusDays(1).toDate());
        exam.setExamActiveEndDate(DateTime.now().plusDays(1).toDate());
        exam.save();
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        RemoteServerHelper.shutdownServer(server);
    }

    @Test
    @RunAsStudent
    public void testListExams() throws Exception {
        Result result = get("/student/exams");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(1);
        Exam exam = deserialize(Exam.class, node.get(0));
        assertThat(exam.getCourse().getCode()).isEqualTo("810136P");
    }

    @Test
    @RunAsStudent
    public void testListExamsNoRemoteEnrolments() throws Exception {
        EnrolmentInterfaceTest.emptyResponse = true;
        Result result = get("/student/exams");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).isEmpty();
   }

    @Test
    public void testX() {
        Exam exam = Ebean.find(Exam.class).fetch("examOwners").where().idEq(1L).findUnique();
        System.out.println(exam);
    }

}
