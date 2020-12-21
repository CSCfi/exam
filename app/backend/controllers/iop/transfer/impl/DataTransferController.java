package backend.controllers.iop.transfer.impl;

import backend.controllers.base.BaseController;
import backend.models.Attachment;
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
import com.fasterxml.jackson.databind.node.JsonNodeType;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import play.Environment;
import play.Logger;
import play.http.HttpErrorHandler;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.mvc.BodyParser;
import play.mvc.Http;
import play.mvc.Result;

public class DataTransferController extends BaseController {
    private static final Logger.ALogger logger = Logger.of(DataTransferController.class);

    static class DataTransferBodyParser extends BodyParser.Json {
        private static final int FIVE_MB = 5000 * 1024;

        @Inject
        DataTransferBodyParser(HttpErrorHandler errorHandler) {
            super(FIVE_MB, errorHandler);
        }
    }

    enum DataType {
        QUESTION
    }

    private final Environment environment;
    private final WSClient wsClient;

    @Inject
    DataTransferController(Environment environment, WSClient wsClient) {
        this.environment = environment;
        this.wsClient = wsClient;
    }

    @SubjectNotPresent
    @BodyParser.Of(DataTransferBodyParser.class)
    public Result importData(Http.Request request) {
        JsonNode body = request.body().asJson();
        if (body.get("type").asText().equals(DataType.QUESTION.toString())) {
            return importQuestions(body);
        }
        return notAcceptable();
    }

    private JsonNode questionToJson(Question question, JsonNode node, PathProperties pp) {
        JsonNode questionNode = serialize(question, pp);
        ((ObjectNode) questionNode).set("attachment", node);
        return questionNode;
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

            // attachments to JSON node (fileName, mime, data in B64)
            Map<Question, Attachment> attachments = questions
                .stream()
                .filter(q -> q.getAttachment() != null && new File(q.getAttachment().getFilePath()).exists())
                .collect(Collectors.toMap(Function.identity(), Question::getAttachment));
            Map<Question, JsonNode> qn = attachments
                .entrySet()
                .stream()
                .collect(
                    Collectors.toMap(
                        Map.Entry::getKey,
                        e -> {
                            Attachment attachment = e.getValue();
                            File file = new File(attachment.getFilePath());
                            try (InputStream is = new FileInputStream(file)) {
                                final String encoded = Base64.getEncoder().encodeToString(is.readAllBytes());
                                return Json
                                    .newObject()
                                    .put("fileName", attachment.getFileName())
                                    .put("mimeType", attachment.getMimeType())
                                    .put("data", encoded);
                            } catch (IOException ioe) {
                                logger.error("Failed to encode attachment to Base64", ioe);
                                return NullNode.getInstance();
                            }
                        }
                    )
                );

            JsonNode data =
                ((ObjectNode) body).put("path", path)
                    .put("owner", user.getEppn())
                    .set(
                        "questions",
                        Json
                            .newArray()
                            .addAll(
                                qn
                                    .entrySet()
                                    .stream()
                                    .map(e -> questionToJson(e.getKey(), e.getValue(), pp))
                                    .collect(Collectors.toList())
                            )
                    );

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

    private Attachment importAttachment(JsonNode node, Long id) throws IOException {
        String path = AppUtil.createFilePath(environment, "question", id.toString());
        File file = new File(path);
        try (OutputStream os = new FileOutputStream(file)) {
            byte[] data = Base64.getDecoder().decode(node.get("data").asText());
            os.write(data);
        }
        Attachment attachment = new Attachment();
        attachment.setFilePath(path);
        attachment.setFileName(node.get("fileName").asText());
        attachment.setMimeType(node.get("mimeType").asText());
        return attachment;
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
                    Optional<JsonNode> attachmentNode = n.has("attachment") &&
                        n.get("attachment").getNodeType() == JsonNodeType.OBJECT
                        ? Optional.of(n.get("attachment"))
                        : Optional.empty();
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
                    attachmentNode.ifPresent(
                        an -> {
                            try {
                                Attachment attachment = importAttachment(an, copy.getId());
                                attachment.save();
                                copy.setAttachment(attachment);
                                copy.update();
                            } catch (IOException e) {
                                logger.error("Failed to create attachment for imported question", e);
                            }
                        }
                    );
                }
            );
        return created();
    }
}
