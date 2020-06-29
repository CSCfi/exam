/*
 * Copyright (c) 2018 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */

package backend.controllers.iop.collaboration.impl;

import akka.stream.javadsl.Source;
import akka.util.ByteString;
import backend.controllers.iop.collaboration.api.CollaborativeAttachmentInterface;
import backend.models.Exam;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.util.config.ConfigReader;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import java.net.URL;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.function.Function;
import javax.inject.Inject;
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

    @Inject
    private ConfigReader configReader;

    @Override
    public Optional<CollaborativeExam> getExternalExam(Long eid, Http.Request request) {
        final ExpressionList<CollaborativeExam> query = Ebean.find(CollaborativeExam.class).where().eq("id", eid);
        return query.findOneOrEmpty();
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
            .thenComposeAsync(
                response -> {
                    if (response.getStatus() != OK) {
                        return CompletableFuture.completedFuture(Results.internalServerError());
                    }
                    return CompletableFuture.completedFuture(Results.ok());
                }
            );
    }

    @Override
    public CompletionStage<Result> updateExternalAssessment(
        CollaborativeExam exam,
        String assessmentRef,
        Http.Request request
    ) {
        return downloadAssessment(exam.getExternalRef(), assessmentRef)
            .thenComposeAsync(
                optionalAssessment -> {
                    if (optionalAssessment.isPresent()) {
                        MultipartForm mf = getForm(request);
                        Http.MultipartFormData.FilePart<Files.TemporaryFile> filePart = mf.getFilePart();
                        return uploadAssessmentAttachment(filePart, optionalAssessment.get())
                            .thenComposeAsync(
                                oa -> {
                                    if (oa.isEmpty()) {
                                        return CompletableFuture.completedFuture(Results.internalServerError());
                                    }
                                    JsonNode attachment = oa.get().get("exam").get("examFeedback").get("attachment");
                                    return uploadAssessment(exam, assessmentRef, oa.get())
                                        .thenApplyAsync(
                                            revision -> {
                                                if (revision.isPresent()) {
                                                    ((ObjectNode) attachment).put("rev", revision.get());
                                                    return ok(attachment);
                                                }
                                                return internalServerError();
                                            }
                                        );
                                }
                            );
                    }
                    return wrapAsPromise(notFound());
                }
            );
    }

    @Override
    public CompletionStage<Result> deleteExternalAssessment(CollaborativeExam exam, String assessmentRef) {
        return downloadAssessment(exam.getExternalRef(), assessmentRef)
            .thenComposeAsync(
                optionalAssessment -> {
                    if (optionalAssessment.isPresent()) {
                        JsonNode assessment = optionalAssessment.get();
                        return removeAssessmentAttachment(assessment)
                            .thenComposeAsync(
                                result -> {
                                    if (result.status() != OK) {
                                        return CompletableFuture.completedFuture(Results.internalServerError());
                                    }
                                    JsonNode feedbackNode = assessment.get("exam").get("examFeedback");
                                    ((ObjectNode) feedbackNode).remove("attachment");
                                    return uploadAssessment(exam, assessmentRef, assessment)
                                        .thenApplyAsync(
                                            revision -> {
                                                if (revision.isPresent()) {
                                                    return ok(Json.newObject().put("rev", revision.get()));
                                                }
                                                return internalServerError();
                                            }
                                        );
                                }
                            );
                    }
                    return wrapAsPromise(notFound());
                }
            );
    }

    @Override
    public boolean setExam(CollaborativeExam collaborativeExam, Exam exam, User user) {
        try {
            return uploadExam(collaborativeExam, exam, user)
                .thenApply(result -> result.status() == 200)
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
