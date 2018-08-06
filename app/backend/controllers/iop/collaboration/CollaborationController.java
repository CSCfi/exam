package backend.controllers.iop.collaboration;

import akka.actor.ActorSystem;
import backend.controllers.base.BaseController;
import backend.impl.EmailComposer;
import backend.impl.ExamUpdater;
import backend.models.Exam;
import backend.models.Role;
import backend.models.Session;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Model;
import play.Logger;
import play.libs.concurrent.HttpExecutionContext;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;
import scala.concurrent.duration.Duration;

import javax.inject.Inject;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

class CollaborationController extends BaseController {

    @Inject
    WSClient wsClient;

    @Inject
    protected ExamUpdater examUpdater;

    @Inject
    protected HttpExecutionContext ec;

    @Inject
    private ActorSystem as;

    @Inject
    private EmailComposer composer;

    private Random random = new Random();


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

    CompletionStage<Optional<Exam>> downloadExam(CollaborativeExam ce) {
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
                ce.update();
                return Optional.of(ce.getExam(root));
            };
            return request.get().thenApplyAsync(onSuccess);
        }
        return CompletableFuture.supplyAsync(Optional::empty);
    }

    CompletionStage<Result> uploadExam(CollaborativeExam ce, Exam content, boolean isPrePublication,
                                       Model resultModel, User sender) {
        Optional<URL> url = parseUrl(ce.getExternalRef());
        if (url.isPresent()) {
            WSRequest request = wsClient.url(url.get().toString());
            Function<WSResponse, Result> onSuccess = response -> {
                if (response.getStatus() != OK) {
                    JsonNode root = response.asJson();
                    return internalServerError(root.get("message").asText());
                }
                if (isPrePublication) {
                    Set<String> receivers = content.getExamOwners().stream().map(User::getEmail).collect(Collectors.toSet());
                    as.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
                        composer.composeCollaborativeExamAnnouncement(receivers, sender, content, ce.getId());
                    }, as.dispatcher());
                }
                return resultModel == null ? ok() : ok(resultModel);
            };
            return request.put(serializeForUpdate(content, ce.getRevision())).thenApplyAsync(onSuccess);
        }
        return wrapAsPromise(internalServerError());
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

    JsonNode serialize(Exam exam) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            String json = mapper.writeValueAsString(exam);
            return mapper.readTree(json);
        } catch (IOException e) {
            Logger.error("unable to serialize");
            throw new RuntimeException(e);
        }
    }

    boolean isAuthorizedToView(Exam exam, User user, Session session) {
        return user.hasRole(Role.Name.ADMIN.toString(), session) ||
                exam.getExamOwners().stream().anyMatch(u ->
                        u.getEmail().equals(user.getEmail()) || u.getEppn().equals(user.getEppn()));

    }

    long newId() {
        return Math.abs(random.nextLong());
    }
}
