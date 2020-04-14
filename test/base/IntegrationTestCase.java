package base;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.lang.reflect.Method;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;
import javax.persistence.PersistenceException;
import javax.validation.constraints.NotNull;

import com.fasterxml.jackson.databind.JsonNode;
import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import org.apache.commons.io.FileUtils;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.rules.TestName;
import org.yaml.snakeyaml.Yaml;
import play.Application;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.test.Helpers;

import backend.models.Attachment;
import backend.models.Exam;
import backend.models.ExamInspection;

import backend.models.sections.ExamSectionQuestion;
import backend.models.sections.ExamSectionQuestionOption;
import backend.models.Grade;
import backend.models.GradeScale;
import backend.models.Language;
import backend.models.User;
import backend.models.questions.MultipleChoiceOption;
import backend.models.questions.Question;
import backend.util.json.JsonDeserializer;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;
import static play.test.Helpers.fakeRequest;

public class IntegrationTestCase {

    protected static final int MAIL_TIMEOUT = 20000;
    protected static Application app;
    private String sessionToken;
    protected Long userId;

    private static final Map<String, String> HAKA_HEADERS = new HashMap<>();

    @Rule
    public TestName currentTest = new TestName();

    public IntegrationTestCase() {
        HAKA_HEADERS.put("displayName", "George%20Lazenby");
        HAKA_HEADERS.put("eppn", "george.lazenby@funet.fi");
        HAKA_HEADERS.put("sn", "Lazenby");
        HAKA_HEADERS.put("preferredLanguage", "fi");
        HAKA_HEADERS.put("Shib-Session-ID", "_5d9a583a894275c15edef02c5602c4d7");
        HAKA_HEADERS.put("mail", "glazenby%40funet.fi");
        HAKA_HEADERS.put("unscoped-affiliation", "member;employee;faculty");
        HAKA_HEADERS.put("employeeNumber", "12345");
        HAKA_HEADERS.put("schacPersonalUniqueCode",
                "urn:schac:personalUniqueCode:int:studentID:org3.org:33333;" +
                        "urn:schac:personalUniqueCode:int:studentID:org2.org:22222;" +
                        "urn:schac:personalUniqueCode:int:studentID:org1.org:11111");
        HAKA_HEADERS.put("homeOrganisation", "oulu.fi");
        HAKA_HEADERS.put("Csrf-Token", "nocheck");
        try {
            HAKA_HEADERS.put("logouturl", URLEncoder.encode("https://logout.foo.bar.com?returnUrl=" +
                    URLEncoder.encode("http://foo.bar.com", "UTF-8"), "UTF-8"));
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        System.setProperty("config.resource", "integrationtest.conf");
    }

    // Hook for having stuff done just before logging in a user.
    protected void onBeforeLogin() throws Exception {
        // Default does nothing
    }

    @Before
    public void setUp() throws Exception {
        // Unfortunately we need to restart for each test because there is some weird issue with question id sequence.
        // Ebean allocates us duplicate PKs eventually unless server is recreated in between. This is either a bug with
        // Ebean (batching) or an issue with our question entity JPA mappings.
        app = Helpers.fakeApplication();
        Helpers.start(app);

        addTestData();
        onBeforeLogin();

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
        Helpers.stop(app);
        // Clear exam upload directory
        String uploadPath = ConfigFactory.load().getString(("sitnet.attachments.path"));
        try {
            FileUtils.deleteDirectory(new File(uploadPath));
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    // Common helper methods -->

    protected Result get(String path) {
        return request(Helpers.GET, path, null);
    }

    protected Result get(String path, boolean followRedirects) {
        return request(Helpers.GET, path, null, HAKA_HEADERS, followRedirects);
    }

    protected Result request(String method, String path, JsonNode body) {
        return request(method, path, body, HAKA_HEADERS, false);
    }

    protected Result request(String method, String path, JsonNode body, boolean followRedirects) {
        return request(method, path, body, HAKA_HEADERS, followRedirects);
    }

    protected Result request(String method, String path, JsonNode body, Map<String, String> headers, boolean followRedirects) {
        Http.RequestBuilder request = getRequestBuilder(method, path, headers);
        if (body != null && !method.equals(Helpers.GET)) {
            request = request.bodyJson(body);
        }
        Result result = Helpers.route(app, request);
        if (followRedirects && result.redirectLocation().isPresent()) {
            return request(method, result.redirectLocation().get(), body, headers, false);
        } else {
            return result;
        }
    }

    protected Http.RequestBuilder getRequestBuilder(String method, String path) {
        return getRequestBuilder(method, path, HAKA_HEADERS);
    }

    protected Http.RequestBuilder getRequestBuilder(String method, String path, Map<String, String> headers) {
        Http.RequestBuilder request = fakeRequest(method, path);
        for (Map.Entry<String, String> header : headers.entrySet()) {
            request = request.header(header.getKey(), header.getValue());
        }
        return request;
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
        login(eppn, Collections.emptyMap());
    }

    protected void login(String eppn, Map<String, String> headers) {
        HAKA_HEADERS.put("eppn", eppn);
        headers.forEach(HAKA_HEADERS::put);
        Result result = request(Helpers.POST, "/app/login", null, HAKA_HEADERS, false);
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

    protected void initExamSectionQuestions(Exam exam) {
        exam.setExamSections(new TreeSet<>(exam.getExamSections()));
        exam.getExamInspections().stream().map(ExamInspection::getUser).forEach(u -> {
            u.setLanguage(Ebean.find(Language.class, "en"));
            u.update();
        });
        exam.getExamSections().stream()
                .flatMap(es -> es.getSectionQuestions().stream())
                .filter(esq -> esq.getQuestion().getType() != Question.Type.EssayQuestion)
                .filter(esq -> esq.getQuestion().getType() != Question.Type.ClozeTestQuestion)
                .forEach(esq -> {
                    for (MultipleChoiceOption o : esq.getQuestion().getOptions()) {
                        ExamSectionQuestionOption esqo = new ExamSectionQuestionOption();
                        esqo.setOption(o);
                        esqo.setScore(o.getDefaultScore());
                        esq.getOptions().add(esqo);
                    }
                    esq.save();
                });
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

    @SuppressWarnings("unchecked")
    private void addTestData() throws Exception {
        int userCount;
        try {
            userCount = Ebean.find(User.class).findCount();
        } catch (PersistenceException e) {
            // Tables are likely not there yet, skip this.
            return;
        }
        if (userCount == 0) {

            Yaml yaml = new Yaml(new JodaPropertyConstructor());
            InputStream is = new FileInputStream(new File("test/resources/initial-data.yml"));
            Map<String, List<Object>> all = (Map<String, List<Object>>) yaml.load(is);
            is.close();
            Ebean.saveAll(all.get("role"));
            Ebean.saveAll(all.get("exam-type"));
            Ebean.saveAll(all.get("exam-execution-type"));
            if (Ebean.find(Language.class).findCount() == 0) { // Might already be inserted by evolution
                Ebean.saveAll(all.get("languages"));
            }
            Ebean.saveAll(all.get("organisations"));
            Ebean.saveAll(all.get("attachments"));

            Ebean.saveAll(all.get("users"));

            if (Ebean.find(GradeScale.class).findCount() == 0) { // Might already be inserted by evolution
                Ebean.saveAll(all.get("grade-scales"));
            }
            if (Ebean.find(Grade.class).findCount() == 0) { // Might already be inserted by evolution
                Ebean.saveAll(all.get("grades"));
            }
            Ebean.saveAll(all.get("question-essay"));
            Ebean.saveAll(all.get("question-multiple-choice"));
            Ebean.saveAll(all.get("question-weighted-multiple-choice"));
            Ebean.saveAll(all.get("question-claim-choice"));
            Ebean.saveAll(all.get("question-clozetest"));
            Ebean.saveAll(all.get("softwares"));
            Ebean.saveAll(all.get("courses"));
            Ebean.saveAll(all.get("comments"));
            for (Object o : all.get("exams")) {
                Exam e = (Exam) o;
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

    @NotNull
    protected static File getTestFile(String s) {
        final ClassLoader classLoader = IntegrationTestCase.class.getClassLoader();
        return new File(Objects.requireNonNull(classLoader.getResource(s)).getFile());
    }

    @NotNull
    protected Attachment createAttachment(String fileName, String filePath, String mimeType) {
        final Attachment attachment = new Attachment();
        attachment.setFileName(fileName);
        attachment.setFilePath(filePath);
        attachment.setMimeType(mimeType);
        attachment.save();
        return attachment;
    }

    protected User getLoggerUser() {
        return Ebean.find(User.class, userId);
    }

    @NotNull
    protected ExamSectionQuestion getExamSectionQuestion(Exam exam) throws Exception {
        return getExamSectionQuestion(exam, null);
    }

    @NotNull
    protected ExamSectionQuestion getExamSectionQuestion(Exam exam, Long id) throws Exception {
        return exam.getExamSections().stream()
                .flatMap(examSection -> examSection.getSectionQuestions().stream())
                .filter(sq -> id == null || sq.getId().equals(id))
                .findFirst().orElseThrow(() -> new Exception("Null section question"));
    }
}
