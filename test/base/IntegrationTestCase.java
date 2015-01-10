package base;

import com.avaje.ebean.Ebean;
import com.avaje.ebean.EbeanServer;
import com.avaje.ebean.config.ServerConfig;
import com.avaje.ebean.config.dbplatform.PostgresPlatform;
import com.avaje.ebeaninternal.api.SpiEbeanServer;
import com.avaje.ebeaninternal.server.ddl.DdlGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.junit.*;

import org.junit.rules.TestName;
import play.Configuration;
import play.libs.Json;
import play.mvc.Result;
import play.test.*;
import util.SitnetUtil;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Method;

import static org.fest.assertions.Assertions.*;
import static play.test.Helpers.*;

public class IntegrationTestCase {

    private static FakeApplication app;
    private static DdlGenerator generator;
    protected String sessionToken;

    @Rule
    public TestName currentTest = new TestName();

    @BeforeClass
    public static void startApp() {
        Config config = ConfigFactory.parseFile(new File("conf/integrationtest.conf"));
        app = fakeApplication(new Configuration(config).asMap());
        start(app); // TODO: see if we need this running before resetting db, now it appears to be so
        EbeanServer server = Ebean.getServer("default");
        generator = new DdlGenerator();
        generator.setup((SpiEbeanServer) server, new PostgresPlatform(), new ServerConfig());
    }

    @AfterClass
    public static void stopApp() {
        Helpers.stop(app);
    }

    @Before
    public void setUp() throws IOException, NoSuchMethodException {
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
        }
    }

    protected Result get(String path) {
        return request(Helpers.GET, path, null);
    }

    protected Result request(String method, String path, JsonNode body) {
        FakeRequest request = fakeRequest(method, path);
        if (body != null && !method.equals(Helpers.GET)) {
            request = request.withJsonBody(body);
        }
        if (sessionToken != null) {
            request = request.withHeader("x-sitnet-authentication", sessionToken);
        }
        return route(request);
    }

    protected void loginAsStudent() {
        login("saulistu", "saulistu");
    }

    protected void loginAsTeacher() {
        login("maikaope", "maikaope");
    }

    protected void loginAsAdmin() {
        login("sitnetad", "sitnetad");
    }

    protected void login(String username, String password) {
        Result result = request(Helpers.POST, "/login",
                Json.newObject().put("username", username).put("password", password));
        assertThat(status(result)).isEqualTo(200);
        JsonNode user = Json.parse(contentAsString(result));
        sessionToken = user.get("token").asText();
    }

    protected void logout() {
        request(Helpers.POST, "/logout", null);
    }

}