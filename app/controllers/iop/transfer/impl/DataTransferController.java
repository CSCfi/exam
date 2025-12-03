// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.text.PathProperties;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import miscellaneous.config.ConfigReader;
import miscellaneous.file.FileHandler;
import miscellaneous.json.JsonDeserializer;
import models.attachment.Attachment;
import models.questions.Question;
import models.questions.Tag;
import models.user.User;
import org.apache.pekko.stream.IOResult;
import org.apache.pekko.stream.javadsl.FileIO;
import org.apache.pekko.stream.javadsl.Source;
import org.apache.pekko.util.ByteString;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.http.HttpErrorHandler;
import play.libs.Files;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.mvc.BodyParser;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;
import security.Authenticated;
import validation.core.Attrs;

public class DataTransferController extends BaseController {

    private final Logger logger = LoggerFactory.getLogger(DataTransferController.class);

    static class DataTransferBodyParser extends BodyParser.Json {

        private static final int SEVENTY_MB = 70000 * 1024;

        @Inject
        DataTransferBodyParser(HttpErrorHandler errorHandler) {
            super(SEVENTY_MB, errorHandler);
        }
    }

    enum DataType {
        QUESTION,
    }

    private final WSClient wsClient;
    private final ConfigReader configReader;
    private final FileHandler fileHandler;

    @Inject
    DataTransferController(WSClient wsClient, ConfigReader configReader, FileHandler fileHandler) {
        this.wsClient = wsClient;
        this.configReader = configReader;
        this.fileHandler = fileHandler;
    }

    @SubjectNotPresent
    public Result importQuestionAttachment(Long id, Http.Request request) {
        Question question = DB.find(Question.class, id);
        if (question == null) {
            return notFound();
        }
        Http.MultipartFormData<Files.TemporaryFile> body = request.body().asMultipartFormData();
        Http.MultipartFormData.FilePart<Files.TemporaryFile> filePart = body.getFile("file");
        if (filePart == null) {
            throw new IllegalArgumentException("file not found");
        }
        if (filePart.getFileSize() > configReader.getMaxFileSize()) {
            throw new IllegalArgumentException("i18n_file_too_large");
        }
        String newFilePath;
        try {
            newFilePath = copyFile(filePart.getRef(), "question", Long.toString(id));
        } catch (IOException e) {
            return internalServerError("i18n_error_creating_attachment");
        }
        // Remove the existing one if found
        fileHandler.removePrevious(question);
        Attachment attachment = fileHandler.createNew(filePart, newFilePath);
        question.setAttachment(attachment);
        question.save();
        return created();
    }

    private String copyFile(Files.TemporaryFile srcFile, String... pathParams) throws IOException {
        String newFilePath = fileHandler.createFilePath(pathParams);
        fileHandler.copyFile(srcFile, new File(newFilePath));
        return newFilePath;
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

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> exportData(Http.Request request) throws IOException {
        JsonNode body = request.body().asJson();
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (body.get("type").asText().equals(DataType.QUESTION.toString()) && !body.withArray("ids").isEmpty()) {
            String path = "/integration/iop/import";
            Set<Long> ids = StreamSupport.stream(body.get("ids").spliterator(), false)
                .map(JsonNode::asLong)
                .collect(Collectors.toSet());
            PathProperties pp = PathProperties.parse("(*, options(*), tags(name))");
            var query = DB.find(Question.class);
            query.apply(pp);
            Set<Question> questions = query
                .where()
                .idIn(ids)
                .or()
                .eq("questionOwners", user)
                .eq("creator", user)
                .endOr()
                .findSet();

            JsonNode data = ((ObjectNode) body).put("path", path)
                .put("owner", user.getEppn())
                .set(
                    "questions",
                    Json.newArray().addAll(
                        questions
                            .stream()
                            .map(q -> serialize(q, pp))
                            .toList()
                    )
                );

            URL url = parseURL(body.get("orgRef").asText());
            String uploadUrl = parseUploadURL(body.get("orgRef").asText());
            WSRequest wsr = wsClient.url(url.toString());
            return wsr
                .post(data)
                .thenComposeAsync(response -> {
                    JsonNode root = response.asJson();
                    if (response.getStatus() != Http.Status.CREATED) {
                        return wrapAsPromise(internalServerError(root.get("message").asText("Connection refused")));
                    }
                    Map<Long, Long> entries = StreamSupport.stream(root.get("ids").spliterator(), false).collect(
                        Collectors.toMap(id -> id.get("src").asLong(), id -> id.get("dst").asLong())
                    );
                    Map<Long, Attachment> localAttachments = questions
                        .stream()
                        .filter(q -> q.getAttachment() != null && new File(q.getAttachment().getFilePath()).exists())
                        .collect(Collectors.toMap(Question::getId, Question::getAttachment));
                    // Map question copy ids to attachments
                    Map<Long, Attachment> remoteAttachments = localAttachments
                        .entrySet()
                        .stream()
                        .filter(e -> entries.containsKey(e.getKey()))
                        .collect(Collectors.toMap(e -> entries.get(e.getKey()), Map.Entry::getValue));
                    return CompletableFuture.allOf(
                        remoteAttachments
                            .entrySet()
                            .stream()
                            .map(ra -> {
                                String host = uploadUrl.replace("/id/", String.format("/%d/", ra.getKey()));
                                WSRequest req = wsClient.url(host);
                                return CompletableFuture.runAsync(() ->
                                    req
                                        .post(createSource(ra.getValue()))
                                        .exceptionally(e -> {
                                            logger.error("failed in uploading attachment id {}", ra.getKey(), e);
                                            return null;
                                        })
                                );
                            })
                            .toArray(CompletableFuture[]::new)
                    ).thenComposeAsync(_ -> wrapAsPromise(created()));
                });
        }
        return wrapAsPromise(badRequest());
    }

    private Source<Http.MultipartFormData.Part<? extends Source<ByteString, ?>>, ?> createSource(
        Attachment attachment
    ) {
        Source<ByteString, CompletionStage<IOResult>> source = FileIO.fromPath(Path.of(attachment.getFilePath()));
        Http.MultipartFormData.FilePart<Source<ByteString, CompletionStage<IOResult>>> filePart =
            new Http.MultipartFormData.FilePart<>("file", attachment.getFileName(), attachment.getMimeType(), source);
        return Source.from(Set.of(filePart));
    }

    private URL parseURL(String orgRef) throws MalformedURLException {
        String url = String.format("%s/api/organisations/%s/export", configReader.getIopHost(), orgRef);
        return URI.create(url).toURL();
    }

    private String parseUploadURL(String orgRef) throws MalformedURLException {
        String url = String.format("%s/api/organisations/%s/export/id/attachment", configReader.getIopHost(), orgRef);
        return URI.create(url).toURL().toString();
    }

    private boolean isNewTag(Tag tag, List<Tag> existing) {
        return existing.stream().noneMatch(e -> e.getName().equals(tag.getName()));
    }

    private static class QuestionEntry {

        public Long srcId;
        public Long dstId;

        QuestionEntry(Long src, Long dst) {
            this.srcId = src;
            this.dstId = dst;
        }
    }

    private Result importQuestions(JsonNode node) {
        String eppn = node.get("owner").asText();
        Optional<User> ou = DB.find(User.class).where().eq("eppn", eppn).findOneOrEmpty();
        if (ou.isEmpty()) {
            return badRequest("User not recognized");
        }
        User user = ou.get();
        ArrayNode questionNode = node.withArray("questions");
        List<QuestionEntry> entries = StreamSupport.stream(questionNode.spliterator(), false)
            .map(n -> {
                Question question = JsonDeserializer.deserialize(Question.class, n);
                Question copy = question.copy();
                copy.setParent(null);
                copy.setCreatorWithDate(user);
                copy.setModifierWithDate(user);
                copy.save();
                List<Tag> userTags = DB.find(Tag.class).where().eq("creator", user).findList();
                List<Tag> newTags = question
                    .getTags()
                    .stream()
                    .filter(t -> isNewTag(t, userTags))
                    .toList();
                newTags.forEach(t -> t.setId(null));
                List<Tag> existingTags = userTags
                    .stream()
                    .filter(t -> !isNewTag(t, question.getTags()))
                    .toList();
                DB.saveAll(newTags);
                copy.getTags().addAll(newTags);
                copy.getTags().addAll(existingTags);
                copy.getTags().forEach(t -> t.setCreatorWithDate(user));
                copy.getTags().forEach(t -> t.setModifierWithDate(user));
                copy.getQuestionOwners().clear();
                copy.getQuestionOwners().add(user);
                copy.update();
                DB.saveAll(copy.getOptions());
                return new QuestionEntry(question.getId(), copy.getId());
            })
            .toList();
        ArrayNode an = Json.newArray();
        entries.forEach(entry -> an.add(Json.newObject().put("src", entry.srcId).put("dst", entry.dstId)));
        return Results.created((JsonNode) Json.newObject().set("ids", an));
    }
}
