package controllers;

import base.IntegrationTestCase;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import models.Course;
import models.Grade;
import models.GradeScale;
import org.apache.commons.io.IOUtils;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletHandler;
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
import java.util.List;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

public class CourseInfoImportTest extends IntegrationTestCase {

    public static class CourseInfoServlet extends HttpServlet {

        private File jsonFile = new File("test/resources/courseUnitInfo.json");
        private File expiredJsonFile = new File("test/resources/courseUnitInfoExpired.json");
        private static boolean SEND_EXPIRED_COURSE;

        @Override
        protected void doGet(HttpServletRequest request, HttpServletResponse response) {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_OK);
            File file = SEND_EXPIRED_COURSE ? expiredJsonFile : jsonFile;
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
        Server server = new Server(31245);
        server.setStopAtShutdown(true);
        ServletHandler handler = new ServletHandler();
        handler.addServletWithMapping(CourseInfoServlet.class, "/courseUnitInfo");
        server.setHandler(handler);
        server.start();
    }

    @Test
    public void testGetCourse() throws Exception {
        CourseInfoServlet.SEND_EXPIRED_COURSE = false;
        Result result = get("/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(1);
        Course course = deserialize(Course.class, node.get(0));
        assertThat(course.getCode()).isEqualTo("2121219");
        assertThat(course.getGradeScale().getType()).isEqualTo(GradeScale.Type.OTHER);
        assertThat(course.getGradeScale().getDisplayName()).isEqualTo("0-5");
        assertThat(course.getGradeScale().getExternalRef()).isEqualTo(9);
        List<Grade> grades = Ebean.find(Grade.class).where()
                .eq("gradeScale.id", course.getGradeScale().getId()).findList();
        assertThat(grades).hasSize(7);
    }

    @Test
    public void testGetExpiredCourse() throws Exception {
        CourseInfoServlet.SEND_EXPIRED_COURSE = true;
        Result result = get("/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).isEmpty();
    }

}
