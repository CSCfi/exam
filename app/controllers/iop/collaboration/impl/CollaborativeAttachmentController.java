// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.collaboration.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.iop.collaboration.api.CollaborativeAttachmentInterface;
import io.ebean.DB;
import java.net.URL;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.function.Function;
import javax.inject.Inject;
import miscellaneous.config.ConfigReader;
import models.exam.Exam;
import models.iop.CollaborativeExam;
import models.user.User;
import org.apache.pekko.stream.javadsl.Source;
import org.apache.pekko.util.ByteString;
import play.libs.Files;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

public class CollaborativeAttachmentController
    extends CollaborationController
    implements CollaborativeAttachmentInterface<Long, CollaborativeExam> {

    @Inject
    private WSClient wsClient;

    @Override
    public Optional<CollaborativeExam> getExternalExam(Long eid, Http.Request request) {
        return DB.find(CollaborativeExam.class).where().eq("id", eid).findOneOrEmpty();
    }

    @Override
    public WSClient getWsClient() {
        return wsClient;
    }

    @Override
    public Optional<Exam> getExam(CollaborativeExam collaborativeExam) {
        try {
            return downloadExam(collaborativeExam).toCompletableFuture().get();
        } catch (InterruptedException | ExecutionException e) {
            logger().error("Could not download collaborative exam from XM!", e);
        }
        return Optional.empty();
    }

    private String getExternalId(JsonNode assessment) {
        return assessment.path("exam").path("examFeedback").path("attachment").path("externalId").asText("");
    }

    private CompletionStage<Optional<JsonNode>> uploadAssessmentAttachment(
        Http.MultipartFormData.FilePart<Files.TemporaryFile> file,
        JsonNode assessment
    ) {
        String externalId = getExternalId(assessment);
        Optional<URL> url = parseUrl("/api/attachments/%s", externalId);
        if (url.isEmpty()) {
            return CompletableFuture.completedFuture(Optional.empty());
        }
        final WSRequest request = getWsClient().url(url.get().toString());
        Function<WSResponse, CompletionStage<Optional<JsonNode>>> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != CREATED && response.getStatus() != OK) {
                return CompletableFuture.completedFuture(Optional.empty());
            }
            String newId = root.get("id").asText();
            String mimeType = root.get("mimeType").asText();
            String displayName = root.get("displayName").asText();
            JsonNode feedbackNode = assessment.get("exam").get("examFeedback");
            ((ObjectNode) feedbackNode).set(
                "attachment",
                Json.newObject().put("externalId", newId).put("mimeType", mimeType).put("fileName", displayName)
            );
            return CompletableFuture.completedFuture(Optional.of(assessment));
        };
        Source<Http.MultipartFormData.Part<? extends Source<ByteString, ?>>, ?> source = createSource(file);
        CompletionStage<WSResponse> resp = externalId.isBlank() ? request.post(source) : request.put(source);
        return resp.thenComposeAsync(onSuccess);
    }

    private CompletionStage<Result> removeAssessmentAttachment(JsonNode assessment) {
        String externalId = getExternalId(assessment);
        Optional<URL> url = parseUrl("/api/attachments/%s", externalId);
        if (url.isEmpty()) {
            return CompletableFuture.completedFuture(Results.internalServerError());
        }
        final WSRequest request = getWsClient().url(url.get().toString());
        return request
            .delete()
            .thenComposeAsync(response -> {
                if (response.getStatus() != OK) {
                    return CompletableFuture.completedFuture(Results.internalServerError());
                }
                return CompletableFuture.completedFuture(Results.ok());
            });
    }

    @Override
    public CompletionStage<Result> updateExternalAssessment(
        CollaborativeExam exam,
        String assessmentRef,
        Http.Request request
    ) {
        return downloadAssessment(exam.getExternalRef(), assessmentRef).thenComposeAsync(optionalAssessment -> {
            if (optionalAssessment.isPresent()) {
                MultipartForm mf = getForm(request);
                Http.MultipartFormData.FilePart<Files.TemporaryFile> filePart = mf.getFilePart();
                return uploadAssessmentAttachment(filePart, optionalAssessment.get()).thenComposeAsync(oa -> {
                    if (oa.isEmpty()) {
                        return CompletableFuture.completedFuture(Results.internalServerError());
                    }
                    JsonNode attachment = oa.get().get("exam").get("examFeedback").get("attachment");
                    return uploadAssessment(exam, assessmentRef, oa.get()).thenApplyAsync(revision -> {
                        if (revision.isPresent()) {
                            ((ObjectNode) attachment).put("rev", revision.get());
                            return ok(attachment);
                        }
                        return internalServerError();
                    });
                });
            }
            return wrapAsPromise(notFound());
        });
    }

    @Override
    public CompletionStage<Result> deleteExternalAssessment(CollaborativeExam exam, String assessmentRef) {
        return downloadAssessment(exam.getExternalRef(), assessmentRef).thenComposeAsync(optionalAssessment -> {
            if (optionalAssessment.isPresent()) {
                JsonNode assessment = optionalAssessment.get();
                return removeAssessmentAttachment(assessment).thenComposeAsync(result -> {
                    if (result.status() != OK) {
                        return CompletableFuture.completedFuture(Results.internalServerError());
                    }
                    JsonNode feedbackNode = assessment.get("exam").get("examFeedback");
                    ((ObjectNode) feedbackNode).remove("attachment");
                    return uploadAssessment(exam, assessmentRef, assessment).thenApplyAsync(revision -> {
                        if (revision.isPresent()) {
                            return ok(Json.newObject().put("rev", revision.get()));
                        }
                        return internalServerError();
                    });
                });
            }
            return wrapAsPromise(notFound());
        });
    }

    @Override
    public boolean setExam(CollaborativeExam collaborativeExam, Exam exam, User user) {
        try {
            return uploadExam(collaborativeExam, exam, user)
                .thenApply(result -> result.status() == Http.Status.OK)
                .toCompletableFuture()
                .get();
        } catch (InterruptedException | ExecutionException e) {
            logger().error("Could not update exam to XM!", e);
        }
        return false;
    }

    @Override
    public Long parseId(String id) {
        return Long.parseLong(id);
    }

    @Override
    public CompletionStage<Result> addFeedbackAttachment(Long id, Http.Request request) {
        return wrapAsPromise(notAcceptable());
    }

    @Override
    public CompletionStage<Result> downloadFeedbackAttachment(Long id, Http.Request request) {
        return wrapAsPromise(notAcceptable());
    }

    @Override
    public CompletionStage<Result> deleteFeedbackAttachment(Long id, Http.Request request) {
        return wrapAsPromise(notAcceptable());
    }

    @Override
    public ConfigReader getConfigReader() {
        return configReader;
    }
}
