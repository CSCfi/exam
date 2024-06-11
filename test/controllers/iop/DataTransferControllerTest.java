// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop;

import static org.fest.assertions.Assertions.assertThat;

import base.IntegrationTestCase;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import helpers.RemoteServerHelper;
import io.ebean.DB;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;
import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;
import models.attachment.Attachment;
import models.base.GeneratedIdentityModel;
import models.questions.Question;
import models.questions.Tag;
import models.user.User;
import net.jodah.concurrentunit.Waiter;
import org.eclipse.jetty.server.Server;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Ignore;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

public class DataTransferControllerTest extends IntegrationTestCase {

    private static final String ORG_REF = "thisissomeorgref";
    static File testImage = getTestFile("test_files/test_image.png");
    private static Server server;

    public static class DataTransferServlet extends HttpServlet {

        @Override
        protected void doPost(HttpServletRequest request, HttpServletResponse response) {
            RemoteServerHelper.writeJsonResponse(
                response,
                Json.newObject().set("ids", Json.newArray().add(Json.newObject().put("src", 1).put("dst", 1000))),
                HttpServletResponse.SC_CREATED
            );
        }
    }

    public static class DataTransferAttachmentServlet extends HttpServlet {

        static Waiter waiter = new Waiter();

        @Override
        protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
            response.setStatus(HttpServletResponse.SC_CREATED);
            Part filePart = request.getPart("file");
            waiter.assertEquals(testImage.getName(), filePart.getSubmittedFileName());
            waiter.assertEquals("image/png", filePart.getContentType());
            waiter.resume();
        }
    }

    @BeforeClass
    public static void startServer() throws Exception {
        String baseUrl1 = String.format("/api/organisations/%s/export", ORG_REF);
        String baseUrl2 = String.format("/api/organisations/%s/export/%d/attachment", ORG_REF, 1000);
        server =
            RemoteServerHelper.createAndStartServer(
                31247,
                Map.of(
                    DataTransferServlet.class,
                    List.of(baseUrl1),
                    DataTransferAttachmentServlet.class,
                    List.of(baseUrl2)
                ),
                true
            );
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        RemoteServerHelper.shutdownServer(server);
    }

    @Test
    @RunAsTeacher
    public void testExportQuestion() {
        User user = getLoggerUser();
        List<Question> questions = DB
            .find(Question.class)
            .where()
            .or()
            .eq("questionOwners", user)
            .eq("creator", user)
            .endOr()
            .findList();
        ArrayNode an = new ObjectMapper()
            .valueToTree(questions.stream().map(GeneratedIdentityModel::getId).collect(Collectors.toSet()));
        questions.forEach(q -> an.add(q.getId()));
        ObjectNode body = Json.newObject().put("type", "QUESTION").put("orgRef", ORG_REF).set("ids", an);
        Result result = request(Helpers.POST, "/app/iop/export", body);
        assertThat(result.status()).isEqualTo(201);
    }

    @Test
    @RunAsTeacher
    public void testExportQuestionWithAttachment() throws InterruptedException, TimeoutException {
        User user = getLoggerUser();
        Question question = DB
            .find(Question.class)
            .where()
            .or()
            .eq("questionOwners", user)
            .eq("creator", user)
            .endOr()
            .findList()
            .get(0);
        final Attachment attachment = createAttachment("test_image.png", testImage.getAbsolutePath(), "image/png");
        question.setAttachment(attachment);
        question.save();
        ArrayNode an = new ObjectMapper()
            .valueToTree(List.of(question).stream().map(GeneratedIdentityModel::getId).collect(Collectors.toSet()));
        an.add(question.getId());
        ObjectNode body = Json.newObject().put("type", "QUESTION").put("orgRef", ORG_REF).set("ids", an);
        Result result = request(Helpers.POST, "/app/iop/export", body);
        DataTransferAttachmentServlet.waiter.await(10000, 1);
        assertThat(result.status()).isEqualTo(201);
    }

    @Test
    public void testImportQuestion() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        File from = new File("test/resources/questionImport.json");
        JsonNode json = mapper.readTree(from);

        Result result = request(Helpers.POST, "/integration/iop/import", json);
        assertThat(result.status()).isEqualTo(201);
        assertThat(DB.find(Question.class).where().like("question", "% **import").findCount()).isEqualTo(22);
    }

    @Test
    public void testImportQuestionWithTags() throws IOException {
        User user = DB.find(User.class).where().eq("email", "teacher@funet.fi").findOne();
        Tag existing = new Tag();
        existing.setCreatorWithDate(user);
        existing.setModifierWithDate(user);
        existing.setName("koira");
        existing.save();
        ObjectMapper mapper = new ObjectMapper();
        File from = new File("test/resources/questionImportWithTags.json");
        JsonNode json = mapper.readTree(from);

        Result result = request(Helpers.POST, "/integration/iop/import", json);
        assertThat(result.status()).isEqualTo(201);
        assertThat(
            (long) DB.find(Question.class).where().like("question", "% **import").findOne().getTags().size() == 2
        );
    }

    @Test
    @Ignore("does not operate like this anymore")
    public void testImportQuestionWithAttachment() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        File from = new File("test/resources/questionImportWithAttachment.json");
        JsonNode json = mapper.readTree(from);

        Result result = request(Helpers.POST, "/integration/iop/import", json);
        assertThat(result.status()).isEqualTo(201);
        Question question = DB.find(Question.class).where().like("question", "% **import").findOne();
        assertThat(question.getAttachment()).isNotNull();
    }
}
