package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import base.RunAsTeacher;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import models.*;
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

        private static File jsonFile;

        @Override
        protected void doGet(HttpServletRequest request, HttpServletResponse response) {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_OK);
            File file = jsonFile;
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
        handler.addServletWithMapping(CourseInfoServlet.class, "/courseUnitInfo/oulu");
        server.setHandler(handler);
        server.start();
    }

    public void setUserOrg(String code) {
        User user = Ebean.find(User.class).where().eq("eppn", "student@funet.fi").findUnique();
        Organisation org = null;
        if (code != null) {
            org = Ebean.find(Organisation.class).where().eq("code", code).findUnique();
        }
        user.setOrganisation(org);
        user.update();
    }

    @Test
    @RunAsTeacher
    public void testGetCourseDefaultOrganisation() throws Exception {
        setUserOrg(null);
        CourseInfoServlet.jsonFile = new File("test/resources/courseUnitInfo.json");
        Result result = get("/app/courses?filter=code&q=2121219");
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
    @RunAsTeacher
    public void testGetCourseOfAnotherOrganisation() throws Exception {
        setUserOrg("oulu.fi");

        CourseInfoServlet.jsonFile = new File("test/resources/courseUnitInfo2.json");
        Result result = get("/app/courses?filter=code&q=t7");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(1);
        Course course = deserialize(Course.class, node.get(0));
        assertThat(course.getCode()).isEqualTo("2121220");
        assertThat(course.getGradeScale().getType()).isEqualTo(GradeScale.Type.OTHER);
        assertThat(course.getGradeScale().getDisplayName()).isEqualTo("0-5");
        assertThat(course.getGradeScale().getExternalRef()).isEqualTo(9);
        List<Grade> grades = Ebean.find(Grade.class).where()
                .eq("gradeScale.id", course.getGradeScale().getId()).findList();
        assertThat(grades).hasSize(7);
    }

    @Test
    @RunAsTeacher
    public void testGetCourseMultiple() throws Exception {
        setUserOrg(null);
        CourseInfoServlet.jsonFile = new File("test/resources/courseUnitInfoMultiple.json");
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(8);
        Course course = deserialize(Course.class, node.get(6));
        assertThat(course.getCode()).isEqualTo("T701203");
        assertThat(course.getIdentifier()).isEqualTo("AAAWMhAALAAAmaRAAE");
        assertThat(course.getCredits()).isEqualTo(3);
        assertThat(course.getName()).isEqualTo("Ohjelmoinnin jatkokurssi");
        assertThat(course.getOrganisation().getName()).isEqualTo("Oamk");
    }

    @Test
    @RunAsStudent
    public void testGetCourseUnauthorized() throws Exception {
        setUserOrg(null);
        CourseInfoServlet.jsonFile = new File("test/resources/courseUnitInfo.json");
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(401);
    }

    @Test
    public void testGetCourseUnauthenticated() throws Exception {
        setUserOrg(null);
        CourseInfoServlet.jsonFile = new File("test/resources/courseUnitInfo.json");
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(401);
    }

    @Test
    @RunAsTeacher
    public void testGetExpiredCourse() throws Exception {
        setUserOrg(null);
        CourseInfoServlet.jsonFile = new File("test/resources/courseUnitInfoExpired.json");
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).isEmpty();
    }

}
