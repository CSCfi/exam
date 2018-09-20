package backend.controllers.iop.collaboration.impl;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.inject.Inject;

import akka.actor.ActorSystem;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.Model;
import play.Logger;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;
import play.mvc.Results;
import scala.concurrent.duration.Duration;

import backend.controllers.iop.collaboration.api.CollaborativeExamLoader;
import backend.impl.EmailComposer;
import backend.models.Exam;
import backend.models.User;
import backend.models.json.CollaborativeExam;

public class CollaborativeExamLoaderImpl implements CollaborativeExamLoader {

    private static final int OK = 200;

    @Inject
    WSClient wsClient;

    @Inject
    private ActorSystem as;

    @Inject
    private EmailComposer composer;

    Optional<URL> parseUrl(String examRef) {
        StringBuilder sb = new StringBuilder(ConfigFactory.load().getString("sitnet.integration.iop.host"))
                .append("/api/exams");
        if (examRef != null) {
            sb.append(String.format("/%s", examRef));
        }
        try {
            return Optional.of(new URL(sb.toString()));
        } catch (MalformedURLException e) {
            Logger.error("Malformed URL {}", e);
            return Optional.empty();
        }
    }

    JsonNode serializeForUpdate(Exam exam, String revision) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            String json = mapper.writeValueAsString(exam);
            JsonNode node = mapper.readTree(json);
            return ((ObjectNode) node).put("rev", revision);
        } catch (IOException e) {
            Logger.error("unable to serialize");
            throw new RuntimeException(e);
        }
    }


    @Override
    public CompletionStage<Optional<Exam>> downloadExam(CollaborativeExam ce) {
        Optional<URL> url = parseUrl(ce.getExternalRef());
        if (url.isPresent()) {
            WSRequest request = wsClient.url(url.get().toString());
            Function<WSResponse, Optional<Exam>> onSuccess = response -> {
                JsonNode root = response.asJson();
                if (response.getStatus() != OK) {
                    Logger.warn("non-ok response from XM: {}", root.get("message").asText());
                    return Optional.empty();
                }
                ce.setRevision(root.get("_rev").asText());
                Exam exam = ce.getExam(root);
                // Save certain informative properties locally so we can display them right away in some cases
                ce.setName(exam.getName());
                ce.setExamActiveStartDate(exam.getExamActiveStartDate());
                ce.setExamActiveEndDate(exam.getExamActiveEndDate());
                ce.setEnrollInstruction(exam.getEnrollInstruction());
                ce.setDuration(exam.getDuration());
                ce.setHash(exam.getHash());
                ce.setState(exam.getState());
                ce.update();
                return Optional.of(exam);
            };
            return request.get().thenApplyAsync(onSuccess);
        }
        return CompletableFuture.supplyAsync(Optional::empty);
    }

    @Override
    public CompletionStage<Result> uploadExam(CollaborativeExam ce, Exam content, boolean isPrePublication,
                                              Model resultModel, User sender) {
        Optional<URL> url = parseUrl(ce.getExternalRef());
        if (url.isPresent()) {
            WSRequest request = wsClient.url(url.get().toString());
            Function<WSResponse, Result> onSuccess = response -> {
                if (response.getStatus() != OK) {
                    JsonNode root = response.asJson();
                    return Results.internalServerError(root.get("message").asText());
                }
                if (isPrePublication) {
                    Set<String> receivers = content.getExamOwners().stream().map(User::getEmail).collect(Collectors.toSet());
                    as.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS),
                            () -> composer.composeCollaborativeExamAnnouncement(receivers, sender, content, ce.getId()),
                            as.dispatcher()
                    );
                }
                return resultModel == null ? Results.ok() : ok(resultModel);
            };
            return request.put(serializeForUpdate(content, ce.getRevision())).thenApplyAsync(onSuccess);
        }
        return defer(Results.internalServerError());
    }

    public CompletionStage<Result> deleteExam(CollaborativeExam ce) {
        final Optional<URL> url = parseUrl(ce.getExternalRef());
        if (!url.isPresent()) {
            return defer(Results.internalServerError());
        }
        final WSRequest request = wsClient.url(url.get().toString());
        return request.delete()
                .thenApplyAsync(response -> Results.status(response.getStatus()));
    }

    private CompletionStage<Result> defer(Result result) {
        return CompletableFuture.supplyAsync(() -> result);
    }

    protected Result ok(Object object) {
        String body = Ebean.json().toJson(object);
        return Results.ok(body).as("application/json");
    }
}
