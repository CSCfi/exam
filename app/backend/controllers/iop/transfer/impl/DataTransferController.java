package backend.controllers.iop.transfer.impl;

import backend.controllers.base.BaseController;
import backend.models.User;
import backend.models.questions.Question;
import backend.sanitizers.Attrs;
import backend.security.Authenticated;
import backend.util.AppUtil;
import backend.util.json.JsonDeserializer;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.mvc.Http;
import play.mvc.Result;

public class DataTransferController extends BaseController {

    enum DataType {
        QUESTION
    }

    private final WSClient wsClient;

    @Inject
    DataTransferController(WSClient wsClient) {
        this.wsClient = wsClient;
    }

    // TODO: validation
    @SubjectNotPresent
    public Result importData(Http.Request request) {
        JsonNode body = request.body().asJson();
        if (body.get("type").asText().equals(DataType.QUESTION.toString())) {
            return importQuestions(body);
        }
        return notAcceptable();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> exportData(Http.Request request) throws IOException {
        JsonNode body = request.body().asJson();
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (body.get("type").asText().equals(DataType.QUESTION.toString()) && !body.withArray("ids").isEmpty()) {
            String path = "/integration/iop/import";
            Set<Long> ids = StreamSupport
                .stream(body.get("ids").spliterator(), false)
                .map(JsonNode::asLong)
                .collect(Collectors.toSet());
            PathProperties pp = PathProperties.parse("(*, options(*), tags(*))");
            Query<Question> query = Ebean.find(Question.class);
            query.apply(pp);
            Set<Question> questions = query
                .where()
                .idIn(ids)
                .or()
                .eq("questionOwners", user)
                .eq("creator", user)
                .endOr()
                .findSet();
            JsonNode data =
                ((ObjectNode) body).put("path", path)
                    .put("owner", user.getEppn())
                    .set("questions", serialize(questions, pp));
            URL url = parseURL(body.get("orgRef").asText());
            WSRequest wsr = wsClient.url(url.toString());
            return wsr
                .post(data)
                .thenApplyAsync(
                    response -> {
                        JsonNode root = response.asJson();
                        if (response.getStatus() != Http.Status.CREATED) {
                            return internalServerError(root.get("message").asText("Connection refused"));
                        }
                        return created();
                    }
                );
        }
        return wrapAsPromise(badRequest());
    }

    private URL parseURL(String orgRef) throws MalformedURLException {
        String url = String.format(
            "%s/api/organisations/%s/export",
            ConfigFactory.load().getString("sitnet.integration.iop.host"),
            orgRef
        );
        return new URL(url);
    }

    private Result importQuestions(JsonNode node) {
        String eppn = node.get("owner").asText();
        Optional<User> ou = Ebean.find(User.class).where().eq("eppn", eppn).findOneOrEmpty();
        if (ou.isEmpty()) {
            return badRequest("user not found");
        }
        User user = ou.get();
        ArrayNode questionNode = node.withArray("questions");
        StreamSupport
            .stream(questionNode.spliterator(), false)
            .forEach(
                n -> {
                    Question question = JsonDeserializer.deserialize(Question.class, n);
                    Question copy = question.copy();
                    copy.setParent(null);
                    AppUtil.setCreator(copy, user);
                    AppUtil.setModifier(copy, user);
                    copy.save();
                    copy.getTags().addAll(question.getTags());
                    copy.getQuestionOwners().clear();
                    copy.getQuestionOwners().add(user);
                    copy.update();
                    Ebean.saveAll(copy.getOptions());
                }
            );
        return created();
    }
}
