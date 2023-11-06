package controllers.iop.collaboration.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.base.BaseController;
import controllers.iop.collaboration.api.CollaborativeExamLoader;
import impl.ExamUpdater;
import io.ebean.DB;
import io.ebean.Model;
import io.ebean.text.PathProperties;
import io.vavr.control.Either;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collector;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import javax.inject.Inject;
import models.Exam;
import models.Role;
import models.User;
import models.json.CollaborativeExam;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSResponse;
import play.mvc.Result;
import util.config.ConfigReader;
import util.json.JsonDeserializer;

public class CollaborationController extends BaseController {

    private static final long SAFE_NUMBER = (long) Math.pow(2, 53) - 1;

    @Inject
    WSClient wsClient;

    @Inject
    protected ExamUpdater examUpdater;

    @Inject
    protected CollaborativeExamLoader examLoader;

    @Inject
    protected ConfigReader configReader;

    private final Logger logger = LoggerFactory.getLogger(CollaborationController.class);

    Optional<URL> parseUrl() {
        String url = String.format("%s/api/exams", configReader.getIopHost());
        try {
            return Optional.of(URI.create(url).toURL());
        } catch (MalformedURLException e) {
            logger.error("Malformed URL", e);
            return Optional.empty();
        }
    }

    Optional<URL> parseUrlWithSearchParam(String filter, boolean anonymous) {
        try {
            if (filter == null) {
                return Optional.empty();
            }

            String paramStr = String.format("?filter=%s&anonymous=%s", filter, anonymous);
            String url = String.format("%s/api/exams/search%s", configReader.getIopHost(), paramStr);
            return Optional.of(URI.create(url).toURL());
        } catch (MalformedURLException e) {
            logger.error("Malformed URL", e);
            return Optional.empty();
        }
    }

    protected CompletionStage<Optional<Exam>> downloadExam(CollaborativeExam ce) {
        return examLoader.downloadExam(ce);
    }

    protected CompletionStage<Optional<String>> uploadAssessment(CollaborativeExam ce, String ref, JsonNode payload) {
        return examLoader.uploadAssessment(ce, ref, payload);
    }

    CompletionStage<Optional<JsonNode>> downloadAssessment(String examRef, String assessmentRef) {
        return examLoader.downloadAssessment(examRef, assessmentRef);
    }

    // This is for getting rid of uninteresting user related 1-M relations that can cause problems in
    // serialization of exam
    protected void cleanUser(User user) {
        user.getEnrolments().clear();
        user.getParticipations().clear();
        user.getInspections().clear();
    }

    void updateLocalReferences(JsonNode root, Map<String, CollaborativeExam> locals) {
        // Save references to documents that we don't have locally yet
        StreamSupport
            .stream(root.spliterator(), false)
            .filter(node -> !locals.containsKey(node.get("_id").asText()))
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

    CompletionStage<Result> uploadExam(CollaborativeExam ce, Exam content, User sender) {
        return examLoader.uploadExam(ce, content, sender);
    }

    CompletionStage<Result> uploadExam(CollaborativeExam ce, Exam content, User sender, Model body, PathProperties pp) {
        return examLoader.uploadExam(ce, content, sender, body, pp);
    }

    boolean isAuthorizedToView(Exam exam, User user, String homeOrg) {
        if (exam.getOrganisations() != null) {
            String[] organisations = exam.getOrganisations().split(";");
            if (!Arrays.asList(organisations).contains(homeOrg)) {
                return false;
            }
        }
        return (
            user.getLoginRole() == Role.Name.ADMIN ||
            (
                exam
                    .getExamOwners()
                    .stream()
                    .anyMatch(u ->
                        u.getEmail().equalsIgnoreCase(user.getEmail()) || u.getEmail().equalsIgnoreCase(user.getEppn())
                    ) &&
                exam.hasState(Exam.State.PRE_PUBLISHED, Exam.State.PUBLISHED)
            )
        );
    }

    boolean isUnauthorizedToAssess(Exam exam, User user) {
        return (
            user.getLoginRole() != Role.Name.ADMIN &&
            (
                exam
                    .getExamOwners()
                    .stream()
                    .noneMatch(u ->
                        u.getEmail().equalsIgnoreCase(user.getEmail()) || u.getEmail().equalsIgnoreCase(user.getEppn())
                    ) ||
                !exam.hasState(Exam.State.REVIEW, Exam.State.REVIEW_STARTED, Exam.State.GRADED)
            )
        );
    }

    long newId() {
        return ThreadLocalRandom.current().nextLong(SAFE_NUMBER);
    }

    JsonNode filterDeleted(JsonNode root) {
        return stream(root)
            .filter(ep -> !ep.at("/exam/state").asText("").equals("DELETED"))
            .collect(Collector.of(Json::newArray, ArrayNode::add, ArrayNode::addAll));
    }

    void calculateScores(JsonNode root) {
        stream(root)
            .forEach(ep -> {
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

    Either<Result, Map<CollaborativeExam, JsonNode>> findExamsToProcess(WSResponse response) {
        JsonNode root = response.asJson();
        if (response.getStatus() != OK) {
            return Either.left(internalServerError(root.get("message").asText("Connection refused")));
        }

        Map<String, CollaborativeExam> locals = DB
            .find(CollaborativeExam.class)
            .findSet()
            .stream()
            .collect(Collectors.toMap(CollaborativeExam::getExternalRef, Function.identity()));

        updateLocalReferences(root, locals);

        Map<CollaborativeExam, JsonNode> localToExternal = StreamSupport
            .stream(root.spliterator(), false)
            .collect(Collectors.toMap(node -> locals.get(node.get("_id").asText()), Function.identity()));

        return Either.right(localToExternal);
    }

    Either<CompletionStage<Result>, CollaborativeExam> findCollaborativeExam(Long id) {
        return DB
            .find(CollaborativeExam.class)
            .where()
            .idEq(id)
            .findOneOrEmpty()
            .<Either<CompletionStage<Result>, CollaborativeExam>>map(Either::right)
            .orElse(Either.left(wrapAsPromise(notFound("sitnet_error_exam_not_found"))));
    }

    Either<CompletionStage<Result>, CollaborativeExam> findCollaborativeExam(String ref) {
        return DB
            .find(CollaborativeExam.class)
            .where()
            .eq("externalRef", ref)
            .findOneOrEmpty()
            .<Either<CompletionStage<Result>, CollaborativeExam>>map(Either::right)
            .orElse(Either.left(wrapAsPromise(notFound("sitnet_error_exam_not_found"))));
    }
}
