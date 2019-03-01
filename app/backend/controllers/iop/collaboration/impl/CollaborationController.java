package backend.controllers.iop.collaboration.impl;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import javax.inject.Inject;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.Model;
import io.vavr.control.Either;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.ws.WSClient;
import play.libs.ws.WSResponse;
import play.mvc.Result;

import backend.controllers.base.BaseController;
import backend.controllers.iop.collaboration.api.CollaborativeExamLoader;
import backend.impl.ExamUpdater;
import backend.models.Exam;
import backend.models.Role;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.util.json.JsonDeserializer;

public class CollaborationController extends BaseController {

    @Inject
    WSClient wsClient;

    @Inject
    protected ExamUpdater examUpdater;

    @Inject
    protected CollaborativeExamLoader examLoader;

    private Random random = new Random();

    private static final Logger.ALogger logger = Logger.of(CollaborationController.class);

    Optional<URL> parseUrl() {
        String url = String.format("%s/api/exams", ConfigFactory.load().getString("sitnet.integration.iop.host"));
        try {
            return Optional.of(new URL(url));
        } catch (MalformedURLException e) {
            logger.error("Malformed URL {}", e);
            return Optional.empty();
        }
    }

    protected CompletionStage<Optional<Exam>> downloadExam(CollaborativeExam ce) {
        return examLoader.downloadExam(ce);
    }

    void updateLocalReferences(JsonNode root, Map<String, CollaborativeExam> locals) {
        // Save references to documents that we don't have locally yet
        StreamSupport.stream(root.spliterator(), false)
                .filter(node -> !locals.keySet().contains(node.get("_id").asText()))
                .forEach(node -> {
                    String ref = node.get("_id").asText();
                    String rev = node.get("_rev").asText();
                    final boolean anonymous = node.get("anonymous").booleanValue();
                    CollaborativeExam ce = new CollaborativeExam();
                    ce.setExternalRef(ref);
                    ce.setRevision(rev);
                    ce.setCreated(DateTime.now());
                    ce.setAnonymous(anonymous);
                    ce.save();
                    locals.put(ref, ce);
                });
    }

    CompletionStage<Result> uploadExam(CollaborativeExam ce, Exam content, boolean isPrePublication,
                                       Model resultModel, User sender) {
        return examLoader.uploadExam(ce, content, isPrePublication, resultModel, sender);
    }

    boolean isAuthorizedToView(Exam exam, User user, Role.Name loginRole) {
        return loginRole == Role.Name.ADMIN || (
                exam.getExamOwners().stream().anyMatch(u ->
                        u.getEmail().equals(user.getEmail()) || u.getEmail().equals(user.getEppn()))
                        && exam.hasState(Exam.State.PRE_PUBLISHED, Exam.State.PUBLISHED)
        );
    }

    boolean isUnauthorizedToAssess(Exam exam, User user) {
        return user.getLoginRole() != Role.Name.ADMIN && (exam.getExamOwners().stream().noneMatch(u ->
                u.getEmail().equals(user.getEmail()) || u.getEmail().equals(user.getEppn()))
                || !exam.hasState(Exam.State.REVIEW, Exam.State.REVIEW_STARTED, Exam.State.GRADED));
    }

    long newId() {
        return Math.abs(random.nextLong());
    }

    void calculateScores(JsonNode root) {
        stream(root).forEach(ep -> {
            Exam exam = JsonDeserializer.deserialize(Exam.class, ep.get("exam"));
            exam.setMaxScore();
            exam.setApprovedAnswerCount();
            exam.setRejectedAnswerCount();
            exam.setTotalScore();
            ((ObjectNode) ep).set("exam", serialize(exam));
        });
    }

    Stream<JsonNode> stream(JsonNode node) {
        return StreamSupport.stream(node.spliterator(), false);
    }

    Either<Result, Map<CollaborativeExam, JsonNode>> findExamsToProcess (WSResponse response) {
        JsonNode root = response.asJson();
        if (response.getStatus() != OK) {
            return Either.left(internalServerError(root.get("message").asText("Connection refused")));
        }

        Map<String, CollaborativeExam> locals = Ebean.find(CollaborativeExam.class).findSet().stream()
                .collect(Collectors.toMap(CollaborativeExam::getExternalRef, Function.identity()));

        updateLocalReferences(root, locals);

        Map<CollaborativeExam, JsonNode> localToExternal = StreamSupport.stream(root.spliterator(), false)
                .collect(Collectors.toMap(node -> locals.get(node.get("_id").asText()), Function.identity()));

        return Either.right(localToExternal);
    }

    Either<CompletionStage<Result>, CollaborativeExam> findCollaborativeExam(Long id) {
        return Ebean.find(CollaborativeExam.class).where().idEq(id).findOneOrEmpty()
                .<Either<CompletionStage<Result>, CollaborativeExam>>map(Either::right)
                .orElse(Either.left(wrapAsPromise(notFound("sitnet_error_exam_not_found"))));
    }


}
