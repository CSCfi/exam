// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package base;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;
import static play.test.Helpers.fakeRequest;

import com.fasterxml.jackson.databind.JsonNode;
import com.jayway.jsonpath.Configuration;
import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import io.ebean.DB;
import jakarta.persistence.PersistenceException;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;
import javax.validation.constraints.NotNull;
import miscellaneous.json.JsonDeserializer;
import models.assessment.ExamInspection;
import models.attachment.Attachment;
import models.exam.Exam;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import models.sections.ExamSectionQuestion;
import models.sections.ExamSectionQuestionOption;
import models.user.Language;
import models.user.User;
import org.apache.commons.io.FileUtils;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Rule;
import org.junit.rules.TestName;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.inspector.TrustedTagInspector;
import org.yaml.snakeyaml.representer.Representer;
import play.Application;
import play.inject.guice.GuiceApplicationBuilder;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.test.Helpers;
import play.test.WithApplication;

public class IntegrationTestCase extends WithApplication {

    protected static final int MAIL_TIMEOUT = 20000;
    protected Long userId;
    protected Http.Session session;

    private static final Map<String, String> HAKA_HEADERS = new HashMap<>();

    @Rule
    public TestName currentTest = new TestName();

    public IntegrationTestCase() {
        HAKA_HEADERS.put("displayName", "George%20Lazenby");
        HAKA_HEADERS.put("eppn", "george.lazenby@funet.fi");
        HAKA_HEADERS.put("sn", "Lazenby");
        HAKA_HEADERS.put("preferredLanguage", "de"); // use an unsupported UI language
        HAKA_HEADERS.put("Shib-Session-ID", "_5d9a583a894275c15edef02c5602c4d7");
        HAKA_HEADERS.put("mail", "glazenby%40funet.fi");
        HAKA_HEADERS.put("unscoped-affiliation", "member;employee;faculty");
        HAKA_HEADERS.put("employeeNumber", "12345");
        HAKA_HEADERS.put(
            "schacPersonalUniqueCode",
            "urn:schac:personalUniqueCode:int:peppiID:org3.org:33333;" +
            "urn:schac:personalUniqueCode:int:sisuID:org2.org:22222;" +
            "urn:schac:personalUniqueCode:int:oodiID:org1.org:11111"
        );
        HAKA_HEADERS.put("homeOrganisation", "oulu.fi");
        HAKA_HEADERS.put("Csrf-Token", "nocheck");
        HAKA_HEADERS.put(
            "logouturl",
            URLEncoder.encode(
                "https://logout.foo.bar.com?returnUrl=" +
                URLEncoder.encode("http://foo.bar.com", StandardCharsets.UTF_8),
                StandardCharsets.UTF_8
            )
        );
        // Appears that this is needed for IDE (IntelliJ) to pick up the right configuration?
        System.setProperty("config.resource", "integrationtest.conf");
    }

    // Hook for having stuff done just before logging in a user.
    protected void onBeforeLogin() throws Exception {
        // Default does nothing
    }

    @Override
    protected Application provideApplication() {
        return new GuiceApplicationBuilder().build();
    }

    @Before
    public void setUp() throws Exception {
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
        // Clear exam upload directory
        String uploadPath = "target/attachments";
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

    protected Result request(
        String method,
        String path,
        JsonNode body,
        Map<String, String> headers,
        boolean followRedirects
    ) {
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
        if (this.session != null) {
            request = request.session(this.session.data());
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
        HAKA_HEADERS.putAll(headers);
        Result result = request(Helpers.POST, "/app/session", null, HAKA_HEADERS, false);
        this.session = result.session();
        assertThat(result.status()).isEqualTo(Http.Status.OK);
        JsonNode user = Json.parse(contentAsString(result));
        userId = user.get("id").asLong();
    }

    protected void logout() {
        request(Helpers.DELETE, "/app/session", null);
        this.session = new Http.Session();
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
        return results.toArray(new String[0]);
    }

    protected void initExamSectionQuestions(Exam exam) {
        exam.setExamSections(new TreeSet<>(exam.getExamSections()));
        exam
            .getExamInspections()
            .stream()
            .map(ExamInspection::getUser)
            .forEach(u -> {
                u.setLanguage(DB.find(Language.class, "en"));
                u.update();
            });
        exam
            .getExamSections()
            .stream()
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
                    Collection<?> c = (Collection<?>) object;
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

    private void addTestData() throws Exception {
        int userCount;
        try {
            userCount = DB.find(User.class).findCount();
        } catch (PersistenceException e) {
            // Tables are likely not there yet, skip this.
            return;
        }
        if (userCount == 0) {
            LoaderOptions options = new LoaderOptions();
            options.setMaxAliasesForCollections(400);
            options.setTagInspector(new TrustedTagInspector());
            Yaml yaml = new Yaml(new JodaPropertyConstructor(options), new Representer(new DumperOptions()));
            //Yaml yaml = new Yaml(new JodaPropertyConstructor(), new Representer(new DumperOptions()), new DumperOptions(), options);
            InputStream is = new FileInputStream(new File("test/resources/initial-data.yml"));
            Map<String, List<Object>> all = yaml.load(is);
            is.close();
            DB.saveAll(all.get("role"));
            DB.saveAll(all.get("exam-type"));
            DB.saveAll(all.get("exam-execution-type"));
            DB.saveAll(all.get("languages"));
            DB.saveAll(all.get("organisations"));
            DB.saveAll(all.get("attachments"));
            DB.saveAll(all.get("users"));
            DB.saveAll(all.get("grade-scales"));
            DB.saveAll(all.get("grades"));
            DB.saveAll(all.get("question-essay"));
            DB.saveAll(all.get("question-multiple-choice"));
            DB.saveAll(all.get("question-weighted-multiple-choice"));
            DB.saveAll(all.get("question-claim-choice"));
            DB.saveAll(all.get("question-clozetest"));
            DB.saveAll(all.get("softwares"));
            DB.saveAll(all.get("courses"));
            DB.saveAll(all.get("comments"));
            for (Object o : all.get("exams")) {
                Exam e = (Exam) o;
                e.generateHash();
                e.save();
            }
            DB.saveAll(all.get("exam-sections"));
            DB.saveAll(all.get("section-questions"));
            DB.saveAll(all.get("exam-participations"));
            DB.saveAll(all.get("exam-inspections"));
            DB.saveAll(all.get("mail-addresses"));
            DB.saveAll(all.get("calendar-events"));
            DB.saveAll(all.get("exam-rooms"));
            DB.saveAll(all.get("exam-machines"));
            DB.saveAll(all.get("exam-room-reservations"));
            DB.saveAll(all.get("exam-enrolments"));
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
        return DB.find(User.class, userId);
    }

    @NotNull
    protected ExamSectionQuestion getExamSectionQuestion(Exam exam) throws Exception {
        return getExamSectionQuestion(exam, null);
    }

    @NotNull
    protected ExamSectionQuestion getExamSectionQuestion(Exam exam, Long id) throws Exception {
        return exam
            .getExamSections()
            .stream()
            .flatMap(examSection -> examSection.getSectionQuestions().stream())
            .filter(sq -> id == null || sq.getId().equals(id))
            .findFirst()
            .orElseThrow(() -> new Exception("Null section question"));
    }
}
