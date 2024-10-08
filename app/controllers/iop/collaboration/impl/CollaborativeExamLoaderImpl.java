package controllers.iop.collaboration.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.iop.collaboration.api.CollaborativeExamLoader;
import controllers.iop.transfer.api.ExternalAttachmentLoader;
import io.ebean.DB;
import io.ebean.Model;
import io.ebean.text.PathProperties;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import javax.inject.Inject;
import models.Exam;
import models.ExamParticipation;
import models.User;
import models.json.CollaborativeExam;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;
import util.config.ConfigReader;

public class CollaborativeExamLoaderImpl implements CollaborativeExamLoader {

    private static final int OK = 200;
    private final Logger logger = LoggerFactory.getLogger(CollaborativeExamLoaderImpl.class);

    @Inject
    WSClient wsClient;

    @Inject
    ConfigReader configReader;

    @Inject
    private ExternalAttachmentLoader externalAttachmentLoader;

    private Optional<URL> parseUrl(String examRef) {
        StringBuilder sb = new StringBuilder(configReader.getIopHost()).append("/api/exams");
        if (examRef != null) {
            sb.append(String.format("/%s", examRef));
        }
        try {
            return Optional.of(URI.create(sb.toString()).toURL());
        } catch (MalformedURLException e) {
            logger.error("Malformed URL", e);
            return Optional.empty();
        }
    }

    private Optional<URL> parseAssessmentUrl(String examRef) {
        try {
            return Optional.of(
                URI.create(configReader.getIopHost() + String.format("/api/exams/%s/assessments", examRef)).toURL()
            );
        } catch (MalformedURLException e) {
            logger.error("Malformed URL", e);
            return Optional.empty();
        }
    }

    private JsonNode serializeForUpdate(Exam exam, String revision) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            String json = mapper.writeValueAsString(exam);
            JsonNode node = mapper.readTree(json);
            return ((ObjectNode) node).put("rev", revision);
        } catch (IOException e) {
            logger.error("unable to serialize");
            throw new RuntimeException(e);
        }
    }

    private Optional<URL> parseUrl(String examRef, String assessmentRef) {
        String url = String.format("%s/api/exams/%s/assessments/%s", configReader.getIopHost(), examRef, assessmentRef);
        try {
            return Optional.of(URI.create(url).toURL());
        } catch (MalformedURLException e) {
            logger.error("Malformed URL", e);
            return Optional.empty();
        }
    }

    @Override
    public PathProperties getAssessmentPath() {
        String path =
            "(*, user(id, firstName, lastName, email, eppn, userIdentifier)" +
            "exam(id, name, state, instruction, hash, implementation, duration, trialCount, executionType(id, type), " + // exam
            "examLanguages(code), attachment(id, externalId, fileName)" +
            "autoEvaluationConfig(*, gradeEvaluations(*, grade(*)))" +
            "creditType(*), examType(*), executionType(*)" +
            "gradeScale(*, grades(*))" +
            "examSections(id, name, sequenceNumber, description, lotteryOn, lotteryItemCount," + // exam.examSections
            "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, " + // exam.examSections.sectionQuestions
            "question(id, type, question, attachment(id, externalId, fileName), options(*))" +
            "options(*, option(*))" +
            "essayAnswer(id, answer, objectVersion, attachment(id, externalId, fileName))" +
            "clozeTestAnswer(id, question, answer, objectVersion)" +
            ")), examEnrolments(*, user(firstName, lastName, email, eppn, userIdentifier), " + // exam.examEnrolments
            "reservation(*, machine(*, room(*)))" +
            ")))";
        return PathProperties.parse(path);
    }

    @Override
    public CompletionStage<Boolean> createAssessmentWithAttachments(ExamParticipation participation) {
        String ref = participation.getCollaborativeExam().getExternalRef();
        logger.debug("Sending back collaborative assessment for exam {}", ref);
        Optional<URL> ou = parseAssessmentUrl(ref);
        if (ou.isEmpty()) {
            return CompletableFuture.completedFuture(false);
        }
        return externalAttachmentLoader
            .uploadAssessmentAttachments(participation.getExam())
            .thenComposeAsync(__ -> createAssessment(participation));
    }

    @Override
    public CompletionStage<Boolean> createAssessment(ExamParticipation participation) {
        String ref = participation.getCollaborativeExam().getExternalRef();
        logger.debug("Sending back collaborative assessment for exam {}", ref);
        Optional<URL> ou = parseAssessmentUrl(ref);
        if (ou.isEmpty()) {
            return CompletableFuture.completedFuture(false);
        }
        WSRequest request = wsClient.url(ou.get().toString()).setContentType("application/json");
        Function<WSResponse, Boolean> onSuccess = response -> {
            if (response.getStatus() != Http.Status.CREATED) {
                logger.error("Failed in sending assessment for exam {}", ref);
                return false;
            }
            participation.setSentForReview(DateTime.now());
            participation.update();
            logger.info("Assessment for exam {} processed successfully", ref);
            return true;
        };

        return request
            .post(DB.json().toJson(participation, getAssessmentPath()))
            .thenApplyAsync(onSuccess)
            .exceptionally(t -> {
                logger.error(String.format("Could not send assessment to xm! [id=%s]", participation.getId()), t);
                return false;
            });
    }

    @Override
    public CompletionStage<Optional<String>> uploadAssessment(CollaborativeExam ce, String ref, JsonNode payload) {
        Optional<URL> ou = parseUrl(ce.getExternalRef(), ref);
        if (ou.isEmpty()) {
            return CompletableFuture.completedFuture(Optional.empty());
        }
        ((ObjectNode) payload).set("rev", payload.get("_rev")); // TBD: maybe this should be checked on XM
        WSRequest request = wsClient.url(ou.get().toString());
        Function<WSResponse, Optional<String>> onSuccess = response -> {
            if (response.getStatus() != OK) {
                JsonNode root = response.asJson();
                logger.error(root.get("message").asText());
                return Optional.empty();
            }
            return Optional.of(response.asJson().get("rev").textValue());
        };
        return request.put(payload).thenApplyAsync(onSuccess);
    }

    @Override
    public CompletionStage<Optional<Exam>> downloadExam(CollaborativeExam ce) {
        Optional<URL> url = parseUrl(ce.getExternalRef());
        if (url.isPresent()) {
            WSRequest request = wsClient.url(url.get().toString());
            Function<WSResponse, Optional<Exam>> onSuccess = response -> {
                JsonNode root = response.asJson();
                if (response.getStatus() != OK) {
                    logger.warn("non-ok response from XM: {}", root.get("message").asText());
                    return Optional.empty();
                }
                ce.setRevision(root.get("_rev").asText());
                Exam exam = ce.getExam(root);
                // Save certain informative properties locally, so we can display them right away in some cases
                ce.setName(exam.getName());
                ce.setPeriodStart(exam.getPeriodStart());
                ce.setPeriodEnd(exam.getPeriodEnd());
                ce.setEnrollInstruction(exam.getEnrollInstruction());
                ce.setDuration(exam.getDuration());
                ce.setHash(exam.getHash());
                ce.setState(exam.getState());
                ce.setAnonymous(exam.isAnonymous());
                ce.update();
                return Optional.of(exam);
            };
            return request.get().thenApplyAsync(onSuccess);
        }
        return CompletableFuture.completedFuture(Optional.empty());
    }

    @Override
    public CompletionStage<Optional<JsonNode>> downloadAssessment(String examRef, String assessmentRef) {
        Optional<URL> url = parseUrl(examRef, assessmentRef);
        if (url.isPresent()) {
            WSRequest request = wsClient.url(url.get().toString());
            Function<WSResponse, Optional<JsonNode>> onSuccess = response -> {
                JsonNode root = response.asJson();
                if (response.getStatus() != OK) {
                    logger.warn("non-ok response from XM: {}", root.get("message").asText());
                    return Optional.empty();
                }
                return Optional.of(root);
            };
            return request.get().thenApplyAsync(onSuccess);
        }
        return CompletableFuture.completedFuture(Optional.empty());
    }

    @Override
    public CompletionStage<Result> uploadExam(
        CollaborativeExam ce,
        Exam content,
        User sender,
        Model resultModel,
        PathProperties pp
    ) {
        Optional<URL> url = parseUrl(ce.getExternalRef());
        if (url.isPresent()) {
            WSRequest request = wsClient.url(url.get().toString());
            Function<WSResponse, Result> onSuccess = response -> {
                if (response.getStatus() != OK) {
                    JsonNode root = response.asJson();
                    return Results.internalServerError(root.get("message").asText());
                }
                return resultModel == null ? Results.ok() : ok(resultModel, pp);
            };
            return request.put(serializeForUpdate(content, ce.getRevision())).thenApplyAsync(onSuccess);
        }
        return defer(Results.internalServerError());
    }

    @Override
    public CompletionStage<Result> uploadExam(CollaborativeExam ce, Exam content, User sender) {
        return uploadExam(ce, content, sender, null, null);
    }

    public CompletionStage<Result> deleteExam(CollaborativeExam ce) {
        final Optional<URL> url = parseUrl(ce.getExternalRef());
        if (url.isEmpty()) {
            return defer(Results.internalServerError());
        }
        final WSRequest request = wsClient.url(url.get().toString());
        return request.delete().thenApplyAsync(response -> Results.status(response.getStatus()));
    }

    private CompletionStage<Result> defer(Result result) {
        return CompletableFuture.completedFuture(result);
    }

    protected Result ok(Object object, PathProperties pp) {
        String body = pp == null ? DB.json().toJson(object) : DB.json().toJson(object, pp);
        return Results.ok(body).as("application/json");
    }
}
