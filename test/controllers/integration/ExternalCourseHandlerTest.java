// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.integration;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import base.IntegrationTestCase;
import base.RunAsAdmin;
import base.RunAsStudent;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.DB;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;
import models.exam.Course;
import models.exam.Grade;
import models.exam.GradeScale;
import models.facility.Organisation;
import models.user.User;
import org.apache.commons.io.IOUtils;
import org.eclipse.jetty.ee10.servlet.ServletContextHandler;
import org.eclipse.jetty.server.Connector;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.ServerConnector;
import org.junit.BeforeClass;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;

public class ExternalCourseHandlerTest extends IntegrationTestCase {

    public static class CourseInfoServlet extends HttpServlet {

        private static File jsonFile;

        static void setFile(File file) {
            jsonFile = file;
        }

        @Override
        protected void doGet(HttpServletRequest request, HttpServletResponse response) {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_OK);
            try (
                FileInputStream fis = new FileInputStream(jsonFile);
                ServletOutputStream sos = response.getOutputStream()
            ) {
                // Inject a BOM character to test that we can work with it
                sos.print('\ufeff');
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
        Connector connector = new ServerConnector(server);
        server.addConnector(connector);
        server.setStopAtShutdown(true);
        ServletContextHandler handler = new ServletContextHandler();
        handler.setContextPath("/");
        handler.addServlet(CourseInfoServlet.class, "/courseUnitInfo");
        handler.addServlet(CourseInfoServlet.class, "/courseUnitInfo/oulu");
        server.setHandler(handler);
        server.start();
    }

    private void setUserOrg(String code) {
        User user = DB.find(User.class).where().eq("eppn", "student@funet.fi").findOne();
        Organisation org = null;
        if (code != null) {
            org = DB.find(Organisation.class).where().eq("code", code).findOne();
        }
        user.setOrganisation(org);
        user.update();
    }

    @Test
    @RunAsTeacher
    public void testGetCourseDefaultOrganisation() {
        setUserOrg(null);
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"));
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(Http.Status.OK);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(1);
        Course course = deserialize(Course.class, node.get(0));
        assertThat(course.getCode()).isEqualTo("2121219_abcdefghijklmnop");
        assertThat(course.getGradeScale().getType()).isEqualTo(GradeScale.Type.OTHER);
        assertThat(course.getGradeScale().getDisplayName()).isEqualTo("0-5");
        assertThat(course.getGradeScale().getExternalRef()).isEqualTo("9");
        assertThat(course.getCreditsLanguage()).isEqualTo("fi");
        List<Grade> grades = DB.find(Grade.class)
            .where()
            .eq("gradeScale.id", course.getGradeScale().getId())
            .findList();
        assertThat(grades).hasSize(7);
        assertThat(grades.stream().filter(Grade::getMarksRejection).collect(Collectors.toList())).hasSize(1);
        // Check that the imported course got into db
        assertThat(DB.find(Course.class).where().eq("code", "2121219_abcdefghijklmnop").findOne()).isNotNull();
    }

    @Test
    @RunAsTeacher
    public void testGetCourseInternalGradeScale() {
        setUserOrg(null);
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo4.json"));
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(Http.Status.OK);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(1);
        Course course = deserialize(Course.class, node.get(0));
        assertThat(course.getCode()).isEqualTo("2121219_abcdefghijklmnop");
        assertThat(course.getGradeScale().getType()).isEqualTo(GradeScale.Type.ZERO_TO_FIVE);
        assertThat(course.getGradeScale().getDisplayName()).isNull();
        assertThat(course.getGradeScale().getExternalRef()).isNull();
        assertThat(course.getCreditsLanguage()).isEqualTo("fi");
        // Check that the imported course got into db
        assertThat(DB.find(Course.class).where().eq("code", "2121219_abcdefghijklmnop").findOne()).isNotNull();
    }

    @Test
    @RunAsTeacher
    public void testGetCourseDefaultOrganisation2() {
        setUserOrg(null);
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo3.json"));
        Result result = get("/app/courses?filter=code&q=MAT21014");
        assertThat(result.status()).isEqualTo(Http.Status.OK);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(1);
        Course course = deserialize(Course.class, node.get(0));
        assertThat(course.getCode()).isEqualTo("MAT21014_hy-CUR-138798147");
        assertThat(course.getOrganisation().getName()).isEqualTo("Helsingin yliopisto");
        assertThat(course.getGradeScale().getType()).isEqualTo(GradeScale.Type.OTHER);
        assertThat(course.getGradeScale().getDisplayName()).isEqualTo("0-5");
        assertThat(course.getGradeScale().getExternalRef()).isEqualTo("sis-0-5");
        assertThat(course.getCreditsLanguage()).isEqualTo("en");
        List<Grade> grades = DB.find(Grade.class)
            .where()
            .eq("gradeScale.id", course.getGradeScale().getId())
            .findList();
        assertThat(grades).hasSize(6);
        assertThat(grades.stream().filter(Grade::getMarksRejection).collect(Collectors.toList())).hasSize(1);
        // Check that the imported course got into db
        Course c = DB.find(Course.class).where().eq("code", "MAT21014_hy-CUR-138798147").findOne();
        assertThat(c).isNotNull();
        assertThat(c.getGradeScale().getGrades()).hasSize(6);
    }

    @Test
    @RunAsAdmin
    public void testUpdateCourse() {
        setUserOrg(null);

        // Import a new course
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"));
        get("/app/courses?filter=code&q=2121219");

        // Have it updated with new data
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfoUpdated.json"));
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(Http.Status.OK);

        Course course = DB.find(Course.class).where().eq("code", "2121219_abcdefghijklmnop").findOne();
        assertThat(course).isNotNull();
        assertThat(course.getName()).endsWith("2");
        assertThat(course.getGradeScale().getDisplayName()).isEqualTo("1-2");
    }

    @Test
    @RunAsTeacher
    public void testAlwaysSearchForRemoteCourse() {
        // This is to make sure that we can import a course that shares the same prefix and has shorter code than a
        // course already found in db
        // remote code = 2121219_abcdefghijklmnop
        // local code = 2121219_abcdefghijklmnopq
        setUserOrg(null);

        Course course = new Course();
        course.setCode("2121219_abcdefghijklmnopq");
        course.save();

        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"));
        Result result = get("/app/courses?filter=code&q=2121219_abcdefghijklmnop");
        assertThat(result.status()).isEqualTo(Http.Status.OK);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(2);
        Course c1 = deserialize(Course.class, node.get(0));
        assertThat(c1.getCode()).isEqualTo("2121219_abcdefghijklmnop");
        Course c2 = deserialize(Course.class, node.get(1));
        assertThat(c2.getCode()).isEqualTo("2121219_abcdefghijklmnopq");
        // check that a remote course was added to the database
        assertThat(DB.find(Course.class).where().eq("code", "2121219_abcdefghijklmnop")).isNotNull();
    }

    @Test
    @RunAsTeacher
    public void testGetCourseOfAnotherOrganisation() {
        setUserOrg("oulu.fi");

        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo2.json"));
        Result result = get("/app/courses?filter=code&q=t7");
        assertThat(result.status()).isEqualTo(Http.Status.OK);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(1);
        Course course = deserialize(Course.class, node.get(0));
        assertThat(course.getCode()).isEqualTo("2121220");
        assertThat(course.getGradeScale().getType()).isEqualTo(GradeScale.Type.OTHER);
        assertThat(course.getGradeScale().getDisplayName()).isEqualTo("0-5");
        assertThat(course.getGradeScale().getExternalRef()).isEqualTo("9");
        List<Grade> grades = DB.find(Grade.class)
            .where()
            .eq("gradeScale.id", course.getGradeScale().getId())
            .findList();
        assertThat(grades).hasSize(7);
        assertThat(grades.stream().filter(Grade::getMarksRejection).collect(Collectors.toList())).hasSize(1);
    }

    @Test
    @RunAsTeacher
    public void testGetCourseMultiple() {
        setUserOrg(null);
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfoMultiple.json"));
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(Http.Status.OK);
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
    public void testGetCourseUnauthorized() {
        setUserOrg(null);
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"));
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(Http.Status.FORBIDDEN);
    }

    @Test
    public void testGetCourseUnauthenticated() {
        setUserOrg(null);
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"));
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(Http.Status.UNAUTHORIZED);
    }

    @Test
    @RunAsTeacher
    public void testGetExpiredCourse() {
        setUserOrg(null);
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfoExpired.json"));
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(Http.Status.OK);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).isEmpty();
    }
}
