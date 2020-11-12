package controllers;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import backend.models.Course;
import backend.models.Grade;
import backend.models.GradeScale;
import backend.models.Organisation;
import backend.models.User;
import base.IntegrationTestCase;
import base.RunAsAdmin;
import base.RunAsStudent;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.Ebean;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.commons.io.IOUtils;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletHandler;
import org.junit.BeforeClass;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;

public class CourseInfoImportTest extends IntegrationTestCase {

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

    private void setUserOrg(String code) {
        User user = Ebean.find(User.class).where().eq("eppn", "student@funet.fi").findOne();
        Organisation org = null;
        if (code != null) {
            org = Ebean.find(Organisation.class).where().eq("code", code).findOne();
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
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(1);
        Course course = deserialize(Course.class, node.get(0));
        assertThat(course.getCode()).isEqualTo("2121219_abcdefghijklmnop");
        assertThat(course.getGradeScale().getType()).isEqualTo(GradeScale.Type.OTHER);
        assertThat(course.getGradeScale().getDisplayName()).isEqualTo("0-5");
        assertThat(course.getGradeScale().getExternalRef()).isEqualTo(9);
        List<Grade> grades = Ebean
            .find(Grade.class)
            .where()
            .eq("gradeScale.id", course.getGradeScale().getId())
            .findList();
        assertThat(grades).hasSize(7);
        assertThat(grades.stream().filter(Grade::getMarksRejection).collect(Collectors.toList())).hasSize(1);
        // Check that the imported course got into db
        assertThat(Ebean.find(Course.class).where().eq("code", "2121219_abcdefghijklmnop")).isNotNull();
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
        assertThat(result.status()).isEqualTo(200);

        Course course = Ebean.find(Course.class).where().eq("code", "2121219_abcdefghijklmnop").findOne();
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
        // local code = 21212190_abcdefghijklmnopq
        setUserOrg(null);

        Course course = new Course();
        course.setCode("2121219_abcdefghijklmnopq");
        course.save();

        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"));
        Result result = get("/app/courses?filter=code&q=2121219_abcdefghijklmnop");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(2);
        Course c1 = deserialize(Course.class, node.get(0));
        assertThat(c1.getCode()).isEqualTo("2121219_abcdefghijklmnop");
        Course c2 = deserialize(Course.class, node.get(1));
        assertThat(c2.getCode()).isEqualTo("2121219_abcdefghijklmnopq");
        // check that remote course was added to database
        assertThat(Ebean.find(Course.class).where().eq("code", "2121219_abcdefghijklmnop")).isNotNull();
    }

    @Test
    @RunAsTeacher
    public void testGetCourseOfAnotherOrganisation() {
        setUserOrg("oulu.fi");

        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo2.json"));
        Result result = get("/app/courses?filter=code&q=t7");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).hasSize(1);
        Course course = deserialize(Course.class, node.get(0));
        assertThat(course.getCode()).isEqualTo("2121220");
        assertThat(course.getGradeScale().getType()).isEqualTo(GradeScale.Type.OTHER);
        assertThat(course.getGradeScale().getDisplayName()).isEqualTo("0-5");
        assertThat(course.getGradeScale().getExternalRef()).isEqualTo(9);
        List<Grade> grades = Ebean
            .find(Grade.class)
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
    public void testGetCourseUnauthorized() {
        setUserOrg(null);
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"));
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(401);
    }

    @Test
    public void testGetCourseUnauthenticated() {
        setUserOrg(null);
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"));
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(401);
    }

    @Test
    @RunAsTeacher
    public void testGetExpiredCourse() {
        setUserOrg(null);
        CourseInfoServlet.setFile(new File("test/resources/courseUnitInfoExpired.json"));
        Result result = get("/app/courses?filter=code&q=2121219");
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node).isEmpty();
    }
}
