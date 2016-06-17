package base;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.EbeanServer;
import com.avaje.ebean.TxType;
import com.avaje.ebean.annotation.Transactional;
import com.avaje.ebean.config.ServerConfig;
import com.avaje.ebeaninternal.api.SpiEbeanServer;
import com.fasterxml.jackson.databind.JsonNode;
import com.google.common.collect.ImmutableMap;
import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import models.*;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.rules.TestName;
import play.Application;
import play.db.Database;
import play.db.Databases;
import play.db.evolutions.Evolutions;
import play.libs.Json;
import play.libs.Yaml;
import play.mvc.Http;
import play.mvc.Result;
import play.test.Helpers;

import javax.persistence.PersistenceException;
import java.io.UnsupportedEncodingException;
import java.lang.reflect.Method;
import java.net.URLEncoder;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.*;
import java.util.stream.Collectors;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;
import static play.test.Helpers.fakeRequest;

public class IntegrationTestCase {

    protected static Application app;
    private String sessionToken;
    protected Long userId;

    private static final Map<String, String> HAKA_HEADERS = new HashMap<>();

    static {
        HAKA_HEADERS.put("displayName", "George%20Lazenby");
        HAKA_HEADERS.put("eppn", "george.lazenby@funet.fi");
        HAKA_HEADERS.put("sn", "Lazenby");
        HAKA_HEADERS.put("preferredLanguage", "fi");
        HAKA_HEADERS.put("Shib-Session-ID", "_5d9a583a894275c15edef02c5602c4d7");
        HAKA_HEADERS.put("mail", "glazenby%40funet.fi");
        HAKA_HEADERS.put("unscoped-affiliation", "member;employee;faculty");
        HAKA_HEADERS.put("employeeNumber", "12345");
        HAKA_HEADERS.put("schacPersonalUniqueCode", "12345");
        HAKA_HEADERS.put("homeOrganisation", "oulu.fi");
        try {
            HAKA_HEADERS.put("logouturl", URLEncoder.encode("https://logout.foo.bar.com?returnUrl=" +
                    URLEncoder.encode("http://foo.bar.com", "UTF-8"), "UTF-8"));
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        System.setProperty("config.resource", "integrationtest.conf");
    }

    @Rule
    public TestName currentTest = new TestName();

    private Database getDB() {
        return Databases.createFrom("org.postgresql.Driver", "jdbc:postgresql://localhost/sitnet_test",
                ImmutableMap.of("user", "sitnet", "password", "sitnetsitnet"));
    }

    private void cleanEvolvedTables(Database db) throws SQLException {
        String[] tables = {"language", "grade", "grade_scale"};
        for (String table : tables) {
            Statement stmt = db.getConnection().createStatement();
            stmt.execute("delete from " + table);
            stmt.close();
        }
    }

    @Before
    public void setUp() throws Exception {
        // Unfortunately we need to restart for each test because there is some weird issue with question id sequence.
        // Ebean allocates us duplicate PKs eventually unless server is recreated in between. This is either a bug with
        // Ebean (batching) or an issue with our question entity JPA mappings.
        app = Helpers.fakeApplication();
        Helpers.start(app);
        cleanDB();
        Database db = getDB();
        Evolutions.applyEvolutions(db);
        cleanEvolvedTables(db);
        db.shutdown();

        addTestData();

        Method testMethod = getClass().getDeclaredMethod(currentTest.getMethodName());
        if (testMethod.isAnnotationPresent(RunAsStudent.class)) {
            loginAsStudent();
        } else if (testMethod.isAnnotationPresent(RunAsTeacher.class)) {
            loginAsTeacher();
        } else if (testMethod.isAnnotationPresent(RunAsAdmin.class)) {
            loginAsAdmin();
        }
    }

    private void cleanDB() throws SQLException {
        EbeanServer server = Ebean.getServer("default");
        DropAllDdlGenerator generator = new DropAllDdlGenerator((SpiEbeanServer)server, new ServerConfig());
        // Drop
        Database db = getDB();

        Statement statement = db.getConnection().createStatement();
        try {
            statement.executeUpdate("delete from play_evolutions");
            statement.close();
        } catch (SQLException e) {
            // OK
        }
        db.shutdown();
        generator.runScript(false, generator.generateDropDdl(), "drop all");
    }

    @After
    public void tearDown() throws SQLException {
        if (sessionToken != null) {
            logout();
            sessionToken = null;
            userId = null;
        }
        //cleanDB();
        Helpers.stop(app);
    }

    // Common helper methods -->

    protected Result get(String path) {
        return request(Helpers.GET, path, null);
    }

    protected Result request(String method, String path, JsonNode body) {
        return request(method, path, body, HAKA_HEADERS);
    }

    protected Result request(String method, String path, JsonNode body, Map<String, String> headers) {
        Http.RequestBuilder request = fakeRequest(method, path);
        for (Map.Entry<String, String> header : headers.entrySet()) {
            request.headers().put(header.getKey(), new String[]{header.getValue()});
        }
        if (body != null && !method.equals(Helpers.GET)) {
            request = request.bodyJson(body);
        }
        return Helpers.route(request);
    }

    protected void loginAsStudent() {
        login("student@funet.fi");
    }

    protected void loginAsTeacher() {
        login("teacher@funet.fi");
    }

    protected void loginAsAdmin() {
        login("admin@funet.fi");
    }

    protected void login(String eppn) {
        HAKA_HEADERS.put("eppn", eppn);
        Result result = request(Helpers.POST, "/app/login", null, HAKA_HEADERS);
        assertThat(result.status()).isEqualTo(200);
        JsonNode user = Json.parse(contentAsString(result));
        sessionToken = user.get("token").asText();
        userId = user.get("id").asLong();
    }

    protected void logout() {
        request(Helpers.POST, "/app/logout", null);
    }

    protected <T> T deserialize(Class<T> model, JsonNode node) {
        return JsonDeserializer.deserialize(model, node);
    }

    protected void assertPathsExist(JsonNode node, String... paths) {
        assertPaths(node, true, paths);
    }

    protected void assertPathsDoNotExist(JsonNode node, String... paths) {
        assertPaths(node, false, paths);
    }

    protected void assertPathCounts(JsonNode node, int count, String... paths) {
        Object document = Configuration.defaultConfiguration().jsonProvider().parse(node.toString());
        for (String path : paths) {
            List<String> pathList = JsonPath.read(document, path);
            assertThat(pathList).hasSize(count);
            try {
                JsonPath.read(document, path);
            } catch (PathNotFoundException e) {
                Assert.fail("Path not found: " + path);
            }
        }
    }

    // Constructs N search paths based on given fields. Usable for array nodes (such as list of exams returned by app)
    // see https://github.com/jayway/JsonPath for path syntax
    protected String[] jsonPaths(String[] paths, int count) {
        List<String> results = new ArrayList<>();
        for (int i = 0; i < count; ++i) {
            for (String path : paths) {
                results.add(String.format("$[%d].%s", i, path));
            }
        }
        return results.toArray(new String[results.size()]);
    }

    private void assertPaths(JsonNode node, boolean shouldExist, String... paths) {
        Object document = Configuration.defaultConfiguration().jsonProvider().parse(node.toString());
        for (String path : paths) {
            try {
                Object object = JsonPath.read(document, path);
                if (isIndefinite(path)) {
                    Collection c = (Collection) object;
                    assertThat(c.isEmpty()).isNotEqualTo(shouldExist);
                } else if (!shouldExist) {
                    Assert.fail("Expected path not to be found: " + path);
                }
            } catch (PathNotFoundException e) {
                if (shouldExist) {
                    Assert.fail("Path not found: " + path);
                }
            }
        }
    }

    private boolean isIndefinite(String path) {
        return path.contains("..") || path.contains("?(") || path.matches(".*(\\d+ *,)+.*");
    }

    private static void addTestUsers(Map<String, List<Object>> sources) {
        sources.get("users").stream().map(User.class::cast).collect(Collectors.toList()).forEach(u -> {
            String uname = u.getEppn().split("@")[0];
            Role student = Ebean.find(Role.class).where().eq("name", Role.Name.STUDENT.toString()).findUnique();
            Role teacher = Ebean.find(Role.class).where().eq("name", Role.Name.TEACHER.toString()).findUnique();
            Role admin = Ebean.find(Role.class).where().eq("name", Role.Name.ADMIN.toString()).findUnique();
            switch (uname) {
                case "student":
                    u.getRoles().add(student);
                    break;
                case "teacher":
                    u.getRoles().add(teacher);
                    break;
                case "admin":
                    u.getRoles().add(admin);
                    break;
            }
            u.save();
        });
    }

    @Transactional(type = TxType.REQUIRES_NEW)
    @SuppressWarnings("unchecked")
    private static void addTestData() {
        int userCount;
        try {
            userCount = Ebean.find(User.class).findRowCount();
        } catch (PersistenceException e) {
            // Tables are likely not there yet, skip this.
            return;
        }
        if (userCount == 0) {
            Map<String, List<Object>> all = (Map<String, List<Object>>) Yaml.load("initial-data.yml");
            if (Ebean.find(Language.class).findRowCount() == 0) { // Might already be inserted by evolution
                Ebean.saveAll(all.get("languages"));
            }
            Ebean.saveAll(all.get("organisations"));
            Ebean.saveAll(all.get("attachments"));

            addTestUsers(all);

            if (Ebean.find(GradeScale.class).findRowCount() == 0) { // Might already be inserted by evolution
                Ebean.saveAll(all.get("grade-scales"));
            }
            if (Ebean.find(Grade.class).findRowCount() == 0) { // Might already be inserted by evolution
                Ebean.saveAll(all.get("grades"));
            }
            Ebean.saveAll(all.get("question-essay"));
            Ebean.saveAll(all.get("question-multiple-choice"));
            Ebean.saveAll(all.get("question-weighted-multiple-choice"));
            Ebean.saveAll(all.get("softwares"));
            Ebean.saveAll(all.get("courses"));
            Ebean.saveAll(all.get("comments"));
            for (Object o : all.get("exams")) {
                Exam e = (Exam) o;
                e.setExecutionType(Ebean.find(ExamExecutionType.class, 1));
                e.generateHash();
                e.save();
            }
            Ebean.saveAll(all.get("exam-sections"));
            Ebean.saveAll(all.get("section-questions"));
            Ebean.saveAll(all.get("exam-participations"));
            Ebean.saveAll(all.get("exam-inspections"));
            Ebean.saveAll(all.get("mail-addresses"));
            Ebean.saveAll(all.get("calendar-events"));
            Ebean.saveAll(all.get("exam-rooms"));
            Ebean.saveAll(all.get("exam-machines"));
            Ebean.saveAll(all.get("exam-room-reservations"));
            Ebean.saveAll(all.get("exam-enrolments"));
        }
    }

}
