package controllers.iop;

import static org.fest.assertions.Assertions.assertThat;

import backend.models.User;
import backend.models.base.GeneratedIdentityModel;
import backend.models.questions.Question;
import base.IntegrationTestCase;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import helpers.RemoteServerHelper;
import io.ebean.Ebean;
import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.eclipse.jetty.server.Server;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

public class DataTransferControllerTest extends IntegrationTestCase {
    private static final String ORG_REF = "thisissomeorgref";
    private static Server server;

    public static class DataTransferServlet extends HttpServlet {

        @Override
        protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
            JsonNode body = new ObjectMapper().readTree(request.getReader());
            response.setStatus(HttpServletResponse.SC_CREATED);
        }
    }

    @BeforeClass
    public static void startServer() throws Exception {
        String baseUrl = String.format("/api/organisations/%s/export", ORG_REF);
        server = RemoteServerHelper.createAndStartServer(31247, Map.of(DataTransferServlet.class, List.of(baseUrl)));
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        RemoteServerHelper.shutdownServer(server);
    }

    @Test
    @RunAsTeacher
    public void testExportQuestion() {
        User user = getLoggerUser();
        List<Question> questions = Ebean
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
        Result result = request(Helpers.POST, "/integration/iop/export", body);
        assertThat(result.status()).isEqualTo(201);
    }

    @Test
    public void testImportQuestion() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        File from = new File("test/resources/questionImport.json");
        JsonNode json = mapper.readTree(from);

        Result result = request(Helpers.POST, "/integration/iop/import", json);
        assertThat(result.status()).isEqualTo(201);
        assertThat(Ebean.find(Question.class).where().like("question", "% **import").findCount()).isEqualTo(22);
    }
}
