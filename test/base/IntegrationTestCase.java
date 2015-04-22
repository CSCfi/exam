package base;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.EbeanServer;
import com.avaje.ebean.config.ServerConfig;
import com.avaje.ebean.config.dbplatform.PostgresPlatform;
import com.avaje.ebeaninternal.api.SpiEbeanServer;
import com.avaje.ebeaninternal.server.ddl.DdlGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.rules.TestName;
import play.libs.Json;
import play.mvc.Result;
import play.test.FakeApplication;
import play.test.FakeRequest;
import play.test.Helpers;
import util.SitnetUtil;

import java.lang.reflect.Method;
import java.util.*;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.*;

public class IntegrationTestCase {

    protected static FakeApplication app;
    protected String sessionToken;
    protected Long userId;

    private static final Map<String, String> HAKA_HEADERS = new HashMap<String, String>();
    static {
        HAKA_HEADERS.put("displayName", "George");
        HAKA_HEADERS.put("eppn", "george.lazenby@funet.fi");
        HAKA_HEADERS.put("sn", "Lazenby");
        HAKA_HEADERS.put("preferredLanguage", "fi");
        HAKA_HEADERS.put("Shib-Session-ID", "_5d9a583a894275c15edef02c5602c4d7");
        HAKA_HEADERS.put("mail", "glazenby%40funet.fi");
        HAKA_HEADERS.put("unscoped-affiliation", "member;employee;faculty");
    }

    @Rule
    public TestName currentTest = new TestName();

    protected void startApp() {
        app = fakeApplication(new FakeGlobal());
        start(app);
    }

    public static void stopApp() {
        stop(app);
    }

    @Before
    public void setUp() throws Exception {
        // Unfortunately we need to restart for each test because there is some weird issue with question id sequence.
        // Ebean allocates us duplicate PKs eventually unless server is recreated in between. This is either a bug with
        // Ebean (batching) or an issue with our question entity JPA mappings.
        System.setProperty("config.file", "conf/integrationtest.conf");
        startApp();
        EbeanServer server = Ebean.getServer("default");

        DdlGenerator generator = new DdlGenerator();
        generator.setup((SpiEbeanServer) server, new PostgresPlatform(), new ServerConfig());
        // Drop
        generator.runScript(false, generator.generateDropDdl());
        // Create
        generator.runScript(false, generator.generateCreateDdl());
        // Initialize
        SitnetUtil.initializeDataModel();

        Method testMethod = getClass().getDeclaredMethod(currentTest.getMethodName());
        if (testMethod.isAnnotationPresent(RunAsStudent.class)) {
            loginAsStudent();
        } else if (testMethod.isAnnotationPresent(RunAsTeacher.class)) {
            loginAsTeacher();
        } else if (testMethod.isAnnotationPresent(RunAsAdmin.class)) {
            loginAsAdmin();
        }
    }

    @After
    public void tearDown() {
        if (sessionToken != null) {
            logout();
            sessionToken = null;
            userId = null;
        }
        stopApp();
    }

    // Common helper methods -->

    protected Result get(String path) {
        return request(Helpers.GET, path, null);
    }

    protected Result request(String method, String path, JsonNode body) {
        return request(method, path, body, Collections.<String, String>emptyMap());
    }

    protected Result request(String method, String path, JsonNode body, Map<String, String> headers) {
        FakeRequest request = fakeRequest(method, path);
        for (Map.Entry<String, String> header : headers.entrySet()) {
            request = request.withHeader(header.getKey(), header.getValue());
        }
        if (body != null && !method.equals(Helpers.GET)) {
            request = request.withJsonBody(body, method);
        }
        if (sessionToken != null) {
            request = request.withHeader("x-sitnet-authentication", sessionToken);
        }
        return Helpers.route(request);
    }

    protected void loginAsStudent() {
        login("saulistu@funet.fi");
    }

    protected void loginAsTeacher() {
        login("maikaope@funet.fi");
    }

    protected void loginAsAdmin() { login("sitnetad@funet.fi"); }

    protected void login(String eppn) {
        HAKA_HEADERS.put("eppn", eppn);
        Result result = request(Helpers.POST, "/login", null, HAKA_HEADERS);
        assertThat(status(result)).isEqualTo(200);
        JsonNode user = Json.parse(contentAsString(result));
        sessionToken = user.get("token").asText();
        userId = user.get("id").asLong();
    }

    protected void logout() {
        request(Helpers.POST, "/logout", null);
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

    private void assertPaths(JsonNode node, boolean shouldExist, String ... paths) {
        Object document = Configuration.defaultConfiguration().jsonProvider().parse(node.toString());
        for (String path : paths) {
            try {
                Object object = JsonPath.read(document, path);
                if (isIndefinite(path)) {
                    Collection c = (Collection) object;
                    assertThat(c.isEmpty()).isNotEqualTo(shouldExist);
                }
                else if (!shouldExist) {
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

}