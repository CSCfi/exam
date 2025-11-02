// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.collaboration.impl;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import impl.mail.EmailComposer;
import io.ebean.DB;
import io.vavr.control.Either;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.Collection;
import java.util.Iterator;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.inject.Inject;
import miscellaneous.config.ConfigReader;
import miscellaneous.csv.CsvBuilder;
import miscellaneous.file.FileHandler;
import miscellaneous.json.JsonDeserializer;
import models.assessment.ExamInspection;
import models.exam.Exam;
import models.exam.Grade;
import models.iop.CollaborativeExam;
import models.questions.ClozeTestAnswer;
import models.questions.Question;
import models.user.Role;
import models.user.User;
import org.apache.pekko.actor.ActorSystem;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.ObjectUtils;
import play.i18n.Lang;
import play.i18n.MessagesApi;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import scala.concurrent.duration.Duration;
import security.Authenticated;
import system.interceptors.Anonymous;
import validation.java.ExternalRefCollectionSanitizer;
import validation.java.core.Attrs;

public class CollaborativeReviewController extends CollaborationController {

    @Inject
    WSClient wsClient;

    @Inject
    ActorSystem actor;

    @Inject
    EmailComposer emailComposer;

    @Inject
    CsvBuilder csvBuilder;

    @Inject
    FileHandler fileHandler;

    @Inject
    MessagesApi messages;

    @Inject
    ConfigReader configReader;

    private final Logger logger = LoggerFactory.getLogger(CollaborativeReviewController.class);

    private Optional<URL> parseUrl(String examRef, String assessmentRef) {
        String url = String.format("%s/api/exams/%s/assessments", configReader.getIopHost(), examRef);
        if (assessmentRef != null) {
            url += String.format("/%s", assessmentRef);
        }
        try {
            return Optional.of(URI.create(url).toURL());
        } catch (MalformedURLException e) {
            logger.error("Malformed URL", e);
            return Optional.empty();
        }
    }

    private Result handleSingleAssessmentResponse(Http.Request request, WSResponse response, boolean admin, User user) {
        JsonNode root = response.asJson();
        if (response.getStatus() != OK) {
            return internalServerError(root.get("message").asText("Connection refused"));
        }
        JsonNode examNode = root.get("exam");
        String blankAnswerText = messages.get(Lang.forCode(user.getLanguage().getCode()), "clozeTest.blank.answer");

        // Manipulate cloze test answers so that they can be conveniently displayed for review
        stream(examNode.get("examSections"))
            .flatMap(es -> stream(es.get("sectionQuestions")))
            .filter(esq ->
                esq.get("question").get("type").textValue().equals(Question.Type.ClozeTestQuestion.toString())
            )
            .forEach(esq -> {
                if (!esq.get("clozeTestAnswer").isObject() || esq.get("clozeTestAnswer").isEmpty()) {
                    ((ObjectNode) esq).set("clozeTestAnswer", Json.newObject());
                }
                ClozeTestAnswer cta = JsonDeserializer.deserialize(ClozeTestAnswer.class, esq.get("clozeTestAnswer"));
                cta.setQuestionWithResults(esq, blankAnswerText);
                ((ObjectNode) esq).set("clozeTestAnswer", serialize(cta));
            });

        return writeAnonymousResult(request, ok(root), true, admin);
    }

    private Result handleMultipleAssessmentResponse(Http.Request request, WSResponse response, boolean admin) {
        JsonNode root = response.asJson();
        if (response.getStatus() != OK) {
            return internalServerError(root.get("message").asText("Connection refused"));
        }
        JsonNode valid = filterDeleted(root);
        // calculate scores
        calculateScores(valid);
        return writeAnonymousResult(request, ok(valid), true, admin);
    }

    private void forceScoreAnswer(JsonNode examNode, Long qid, Double score) {
        stream(examNode.get("examSections"))
            .flatMap(es -> stream(es.get("sectionQuestions")))
            .filter(esq -> esq.get("id").asLong() == qid)
            .findAny()
            .ifPresent(esq -> ((ObjectNode) esq).put("forcedScore", score));
    }

    private void scoreAnswer(JsonNode examNode, Long qid, Double score) {
        stream(examNode.get("examSections"))
            .flatMap(es -> stream(es.get("sectionQuestions")))
            .filter(esq -> esq.get("id").asLong() == qid)
            .findAny()
            .ifPresent(esq -> {
                JsonNode essayAnswer = esq.get("essayAnswer");
                if (essayAnswer.isObject() && !essayAnswer.isEmpty()) {
                    ((ObjectNode) essayAnswer).put("evaluatedScore", score);
                } else {
                    ((ObjectNode) essayAnswer).set("essayAnswer", Json.newObject().put("evaluatedScore", score));
                }
            });
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    @Anonymous(filteredProperties = { "user" })
    public CompletionStage<Result> listAssessments(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return findCollaborativeExam(id)
            .map(ce ->
                getRequest(ce, null)
                    .map(wsr ->
                        wsr
                            .get()
                            .thenApplyAsync(response ->
                                handleMultipleAssessmentResponse(request, response, user.hasRole(Role.Name.ADMIN))
                            )
                    )
                    .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    @Anonymous(filteredProperties = { "user", "preEnrolledUserEmail", "grade" })
    public CompletionStage<Result> getParticipationsForExamAndUser(Long eid, String aid, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return findCollaborativeExam(eid)
            .map(ce -> {
                Optional<URL> url = parseUrl(ce.getExternalRef(), null);
                if (url.isEmpty()) {
                    return wrapAsPromise(internalServerError());
                }
                WSRequest wsRequest = wsClient.url(url.get().toString());
                return wsRequest
                    .get()
                    .thenApplyAsync(response -> {
                        if (response.getStatus() != OK) {
                            return status(response.getStatus());
                        }
                        final JsonNode root = response.asJson();
                        final Optional<JsonNode> assessment = stream(root)
                            .filter(node -> node.path("_id").asText().equals(aid))
                            .findFirst();
                        if (assessment.isEmpty()) {
                            return notFound("Assessment not found!");
                        }
                        final String eppn = assessment.get().path("user").path("eppn").textValue();
                        if (ObjectUtils.isEmpty(eppn)) {
                            return notFound("Eppn not found!");
                        }
                        // Filter for user eppn and leave out the assessment that we currently are looking for.
                        final Iterator<JsonNode> it = root.iterator();
                        while (it.hasNext()) {
                            JsonNode node = it.next();
                            if (
                                !node.path("user").path("eppn").asText().equals(eppn) ||
                                node.path("_id").asText().equals(aid)
                            ) {
                                it.remove();
                            }
                        }
                        return writeAnonymousResult(request, ok(root), true, user.hasRole(Role.Name.ADMIN));
                    });
            })
            .getOrElseGet(Function.identity());
    }

    private boolean isFinished(JsonNode exam) {
        return (
            exam.get("state").asText().equals(Exam.State.GRADED_LOGGED.toString()) &&
            exam.path("gradingType").asText().equals("GRADED") &&
            exam.get("grade").has("name") &&
            exam.has("gradedByUser") &&
            exam.has("customCredit")
        );
    }

    private void filterFinished(JsonNode node, Collection<String> ids) {
        Iterator<JsonNode> it = node.iterator();
        while (it.hasNext()) {
            JsonNode assessment = it.next();
            if (!ids.contains(assessment.get("_id").asText()) || !isFinished(assessment.get("exam"))) {
                it.remove();
            }
        }
    }

    @Authenticated
    @With(ExternalRefCollectionSanitizer.class)
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public CompletionStage<Result> exportAssessments(Long id, Http.Request request) {
        Collection<String> refs = request.attrs().get(Attrs.REF_COLLECTION);
        return findCollaborativeExam(id)
            .map(ce ->
                getRequest(ce, null)
                    .map(wsr ->
                        wsr
                            .get()
                            .thenApplyAsync(response -> {
                                JsonNode root = response.asJson();
                                if (response.getStatus() != OK) {
                                    return internalServerError(root.get("message").asText("Connection refused"));
                                }
                                filterFinished(root, refs);
                                calculateScores(root);
                                File file;
                                try {
                                    file = csvBuilder.build(root);
                                } catch (IOException e) {
                                    return internalServerError("i18n_error_creating_csv_file");
                                }
                                String contentDisposition = fileHandler.getContentDisposition(file);
                                return ok(fileHandler.encodeAndDelete(file)).withHeader(
                                    "Content-Disposition",
                                    contentDisposition
                                );
                            })
                    )
                    .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    @Anonymous(filteredProperties = { "user", "reservation" })
    public CompletionStage<Result> getAssessment(Long id, String ref, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return findCollaborativeExam(id)
            .map(ce -> {
                Optional<URL> url = parseUrl(ce.getExternalRef(), ref);
                if (url.isEmpty()) {
                    return wrapAsPromise(internalServerError());
                }
                WSRequest wsRequest = wsClient.url(url.get().toString());
                final boolean admin = user.hasRole(Role.Name.ADMIN);
                return wsRequest
                    .get()
                    .thenApplyAsync(response -> handleSingleAssessmentResponse(request, response, admin, user));
            })
            .getOrElseGet(Function.identity());
    }

    private CompletionStage<Result> upload(URL url, JsonNode payload) {
        WSRequest request = wsClient.url(url.toString());
        Function<WSResponse, Result> onSuccess = response -> {
            if (response.getStatus() != OK) {
                JsonNode root = response.asJson();
                return internalServerError(root.get("message").asText());
            }
            return ok(Json.newObject().put("rev", response.asJson().get("rev").textValue()));
        };
        return request.put(payload).thenApplyAsync(onSuccess);
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> updateAnswerScore(Long id, String ref, Long qid, Http.Request request) {
        return findCollaborativeExam(id)
            .map(ce ->
                getURL(ce, ref)
                    .map(url -> {
                        JsonNode body = request.body().asJson();
                        JsonNode scoreNode = body.path("evaluatedScore");
                        Double score = scoreNode.isNumber() ? scoreNode.asDouble() : null;
                        String revision = body.get("rev").asText();
                        WSRequest wsRequest = wsClient.url(url.toString());
                        Function<WSResponse, CompletionStage<Result>> onSuccess = response -> {
                            JsonNode root = response.asJson();
                            if (response.getStatus() != OK) {
                                return wrapAsPromise(
                                    internalServerError(root.get("message").asText("Connection refused"))
                                );
                            }
                            scoreAnswer(root.get("exam"), qid, score);
                            ((ObjectNode) root).put("rev", revision);
                            return upload(url, root);
                        };
                        return wsRequest.get().thenComposeAsync(onSuccess);
                    })
                    .getOrElseGet(Function.identity())
            )
            .get();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> sendInspectionMessage(Long id, String ref, Http.Request request) {
        JsonNode body = request.body().asJson();
        if (!body.has("msg")) {
            return wrapAsPromise(badRequest("no message received"));
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        String message = body.path("msg").asText();
        return findCollaborativeExam(id)
            .map(ce ->
                getURL(ce, ref)
                    .map(url -> {
                        WSRequest wsRequest = wsClient.url(url.toString());
                        Function<WSResponse, CompletionStage<Result>> onSuccess = response -> {
                            JsonNode root = response.asJson();
                            if (response.getStatus() != OK) {
                                return wrapAsPromise(
                                    internalServerError(root.get("message").asText("Connection refused"))
                                );
                            }
                            JsonNode examNode = root.get("exam");
                            Exam exam = JsonDeserializer.deserialize(Exam.class, examNode);
                            if (isUnauthorizedToAssess(exam, user)) {
                                return wrapAsPromise(forbidden("You are not allowed to modify this object"));
                            }
                            Set<User> recipients = exam
                                .getExamInspections()
                                .stream()
                                .map(ExamInspection::getUser)
                                .collect(Collectors.toSet());
                            recipients.addAll(exam.getExamOwners());
                            actor
                                .scheduler()
                                .scheduleOnce(
                                    Duration.create(1, TimeUnit.SECONDS),
                                    () -> {
                                        for (User u : recipients
                                            .stream()
                                            .filter(u -> !u.getEmail().equalsIgnoreCase(user.getEmail()))
                                            .collect(Collectors.toSet())) {
                                            emailComposer.composeInspectionMessage(u, user, ce, exam, message);
                                        }
                                    },
                                    actor.dispatcher()
                                );
                            return wrapAsPromise(ok());
                        };
                        return wsRequest.get().thenComposeAsync(onSuccess);
                    })
                    .getOrElseGet(Function.identity())
            )
            .get();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> forceUpdateAnswerScore(Long id, String ref, Long qid, Http.Request request) {
        CollaborativeExam ce = DB.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("i18n_error_exam_not_found"));
        }
        Optional<URL> url = parseUrl(ce.getExternalRef(), ref);
        if (url.isEmpty()) {
            return wrapAsPromise(internalServerError());
        }
        JsonNode body = request.body().asJson();
        JsonNode scoreNode = body.path("forcedScore");
        Double score = scoreNode.isNumber() ? scoreNode.asDouble() : null;
        String revision = body.get("rev").asText();
        WSRequest wsRequest = wsClient.url(url.get().toString());
        Function<WSResponse, CompletionStage<Result>> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != OK) {
                return wrapAsPromise(internalServerError(root.get("message").asText("Connection refused")));
            }
            forceScoreAnswer(root.get("exam"), qid, score);
            ((ObjectNode) root).put("rev", revision);
            return upload(url.get(), root);
        };
        return wsRequest.get().thenComposeAsync(onSuccess);
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> updateAssessment(Long id, String ref, Http.Request request) {
        return findCollaborativeExam(id)
            .map(ce -> {
                Optional<URL> url = parseUrl(ce.getExternalRef(), ref);
                if (url.isEmpty()) {
                    return wrapAsPromise(internalServerError());
                }
                JsonNode body = request.body().asJson();
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                cleanUser(user);
                WSRequest wsRequest = wsClient.url(url.get().toString());
                Function<WSResponse, CompletionStage<Result>> onSuccess = response -> {
                    JsonNode root = response.asJson();
                    if (response.getStatus() != OK) {
                        return wrapAsPromise(internalServerError(root.get("message").asText("Connection refused")));
                    }
                    JsonNode examNode = root.get("exam");
                    Exam exam = JsonDeserializer.deserialize(Exam.class, examNode);
                    if (isUnauthorizedToAssess(exam, user)) {
                        return wrapAsPromise(forbidden("You are not allowed to modify this object"));
                    }
                    if (
                        exam.hasState(
                            Exam.State.ABORTED,
                            Exam.State.REJECTED,
                            Exam.State.GRADED_LOGGED,
                            Exam.State.ARCHIVED
                        )
                    ) {
                        return wrapAsPromise(forbidden("Not allowed to update grading of this exam"));
                    }
                    JsonNode grade = body.get("grade");
                    if (grade != null && grade.isObject() && !grade.isEmpty()) {
                        boolean validGrade = exam
                            .getGradeScale()
                            .getGrades()
                            .stream()
                            .map(Grade::getId)
                            .anyMatch(i -> i == grade.get("id").asInt());
                        if (validGrade) {
                            ((ObjectNode) examNode).set("grade", grade);
                            ((ObjectNode) examNode).put("gradingType", Grade.Type.GRADED.toString());
                        } else {
                            return wrapAsPromise(badRequest("Invalid grade for this grade scale"));
                        }
                    } else if (body.has("gradingType")) {
                        ((ObjectNode) examNode).set("grade", NullNode.getInstance());
                        ((ObjectNode) examNode).put("gradingType", Grade.Type.NOT_GRADED.toString());
                    } else {
                        ((ObjectNode) examNode).set("grade", NullNode.getInstance());
                    }
                    JsonNode creditType = body.get("creditType");
                    ((ObjectNode) examNode).set("creditType", creditType);
                    ((ObjectNode) examNode).put("additionalInfo", body.path("additionalInfo").asText(null));
                    ((ObjectNode) examNode).put("answerLanguage", body.path("answerLanguage").asText(null));
                    ((ObjectNode) examNode).put(
                        "customCredit",
                        body.path("customCredit").isMissingNode() ? null : body.path("customCredit").doubleValue()
                    );

                    Exam.State newState = Exam.State.valueOf(body.path("state").asText());
                    ((ObjectNode) examNode).put("state", newState.toString());
                    if (newState == Exam.State.GRADED || newState == Exam.State.GRADED_LOGGED) {
                        String gradedTime = ISODateTimeFormat.dateTime().print(DateTime.now());
                        ((ObjectNode) examNode).put("gradedTime", gradedTime);
                        ((ObjectNode) examNode).set("gradedByUser", serialize(user));
                    }
                    String revision = body.path("rev").asText(null);
                    if (revision == null) {
                        return wrapAsPromise(badRequest());
                    }
                    ((ObjectNode) root).put("rev", revision);

                    return upload(url.get(), root);
                };
                return wsRequest.get().thenComposeAsync(onSuccess);
            })
            .getOrElseGet(Function.identity());
    }

    private JsonNode getFeedback(JsonNode body, String revision) {
        JsonNode examNode = body.get("exam");
        if (!examNode.has("examFeedback")) {
            ((ObjectNode) examNode).set("examFeedback", Json.newObject());
        }
        JsonNode feedbackNode = examNode.get("examFeedback");
        ((ObjectNode) body).put("rev", revision);
        return feedbackNode;
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> addComment(Long id, String ref, Http.Request request) {
        return findCollaborativeExam(id)
            .map(ce ->
                getURL(ce, ref)
                    .map(url -> {
                        JsonNode body = request.body().asJson();
                        String revision = body.get("rev").asText();
                        WSRequest wsRequest = wsClient.url(url.toString());
                        Function<WSResponse, CompletionStage<Result>> onSuccess = response -> {
                            JsonNode root = response.asJson();
                            if (response.getStatus() != OK) {
                                return wrapAsPromise(
                                    internalServerError(root.get("message").asText("Connection refused"))
                                );
                            }
                            JsonNode feedbackNode = getFeedback(root, revision);
                            ((ObjectNode) feedbackNode).put("comment", body.get("comment").asText());
                            return upload(url, root);
                        };
                        return wsRequest.get().thenComposeAsync(onSuccess);
                    })
                    .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Restrict({ @Group("STUDENT") })
    public CompletionStage<Result> setFeedbackRead(String examRef, String assessmentRef, Http.Request request) {
        return findCollaborativeExam(examRef)
            .map(ce ->
                getURL(ce, assessmentRef)
                    .map(url -> {
                        JsonNode body = request.body().asJson();
                        String revision = body.get("rev").asText();
                        WSRequest wsRequest = wsClient.url(url.toString());
                        Function<WSResponse, CompletionStage<Result>> onSuccess = response -> {
                            JsonNode root = response.asJson();
                            if (response.getStatus() != OK) {
                                return wrapAsPromise(
                                    internalServerError(root.get("message").asText("Connection refused"))
                                );
                            }
                            JsonNode feedbackNode = getFeedback(root, revision);
                            ((ObjectNode) feedbackNode).put("feedbackStatus", true);
                            return upload(url, root);
                        };
                        return wsRequest.get().thenComposeAsync(onSuccess);
                    })
                    .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER") })
    public CompletionStage<Result> updateAssessmentInfo(Long id, String ref, Http.Request request) {
        return findCollaborativeExam(id)
            .map(ce -> {
                Optional<URL> url = parseUrl(ce.getExternalRef(), ref);
                if (url.isEmpty()) {
                    return wrapAsPromise(internalServerError());
                }
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                JsonNode body = request.body().asJson();
                String revision = body.get("rev").asText();
                WSRequest wsRequest = wsClient.url(url.get().toString());
                Function<WSResponse, CompletionStage<Result>> onSuccess = response ->
                    getResponse(response)
                        .map(r -> {
                            JsonNode root = r.asJson();
                            JsonNode examNode = root.get("exam");
                            Exam exam = JsonDeserializer.deserialize(Exam.class, examNode);
                            if (isUnauthorizedToAssess(exam, user)) {
                                return wrapAsPromise(forbidden("You are not allowed to modify this object"));
                            }
                            if (!exam.hasState(Exam.State.GRADED_LOGGED)) {
                                return wrapAsPromise(forbidden("Not allowed to update grading of this exam"));
                            }
                            ((ObjectNode) examNode).put("assessmentInfo", body.get("assessmentInfo").asText());
                            ((ObjectNode) root).put("rev", revision);
                            return upload(url.get(), root);
                        })
                        .getOrElseGet(Function.identity());

                return wsRequest.get().thenComposeAsync(onSuccess);
            })
            .getOrElseGet(Function.identity());
    }

    private Optional<CompletionStage<Result>> validateExamState(Exam exam, boolean gradeRequired, User user) {
        if (exam == null) {
            return Optional.of(wrapAsPromise(notFound()));
        }
        if (isUnauthorizedToAssess(exam, user)) {
            return Optional.of(wrapAsPromise(forbidden("You are not allowed to modify this object")));
        }
        if (
            (exam.getGrade() == null && gradeRequired) ||
            exam.getCreditType() == null ||
            exam.getAnswerLanguage() == null ||
            exam.getGradedByUser() == null
        ) {
            return Optional.of(wrapAsPromise(forbidden("not yet graded by anyone!")));
        }
        if (
            exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) ||
            exam.getExamRecord() != null
        ) {
            return Optional.of(wrapAsPromise(forbidden("i18n_error_exam_already_graded_logged")));
        }
        return Optional.empty();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> finalizeAssessment(Long id, String ref, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        cleanUser(user);
        JsonNode body = request.body().asJson();
        return findCollaborativeExam(id)
            .map(ce ->
                getURL(ce, ref)
                    .map(url ->
                        getRequest(ce, ref)
                            .map(wsr -> {
                                String revision = body.path("rev").asText(null);
                                if (revision == null) {
                                    return wrapAsPromise(badRequest());
                                }
                                Grade.Type gradingType = Grade.Type.valueOf(body.path("gradingType").asText());
                                Function<WSResponse, CompletionStage<Result>> onSuccess = response ->
                                    getResponse(response)
                                        .map(r -> {
                                            JsonNode root = r.asJson();
                                            JsonNode examNode = root.get("exam");
                                            Exam exam = JsonDeserializer.deserialize(Exam.class, examNode);
                                            return validateExamState(
                                                exam,
                                                gradingType == Grade.Type.GRADED,
                                                user
                                            ).orElseGet(() -> {
                                                ((ObjectNode) examNode).put(
                                                    "state",
                                                    Exam.State.GRADED_LOGGED.toString()
                                                );
                                                if (
                                                    exam.getGradedByUser() == null &&
                                                    exam.getAutoEvaluationConfig() != null
                                                ) {
                                                    // Automatically graded by the system, set graded-by-user at this point.
                                                    ((ObjectNode) examNode).set("gradedByUser", serialize(user));
                                                }
                                                if (gradingType != Grade.Type.GRADED) {
                                                    ((ObjectNode) examNode).put(
                                                        "gradingType",
                                                        Grade.Type.NOT_GRADED.toString()
                                                    );
                                                    ((ObjectNode) examNode).set("grade", NullNode.getInstance());
                                                }
                                                ((ObjectNode) root).put("rev", revision);
                                                return upload(url, root);
                                            });
                                        })
                                        .getOrElseGet(Function.identity());
                                return wsr.get().thenComposeAsync(onSuccess);
                            })
                            .getOrElseGet(Function.identity())
                    )
                    .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    private Either<CompletionStage<Result>, WSResponse> getResponse(WSResponse wsr) {
        JsonNode root = wsr.asJson();
        if (wsr.getStatus() != OK) {
            return Either.left(wrapAsPromise(internalServerError(root.get("message").asText("Connection refused"))));
        }
        return Either.right(wsr);
    }

    private Either<CompletionStage<Result>, URL> getURL(CollaborativeExam ce, String ref) {
        return parseUrl(ce.getExternalRef(), ref)
            .<Either<CompletionStage<Result>, URL>>map(Either::right)
            .orElse(Either.left(wrapAsPromise(internalServerError())));
    }

    private Either<CompletionStage<Result>, WSRequest> getRequest(CollaborativeExam ce, String ref) {
        return parseUrl(ce.getExternalRef(), ref)
            .<Either<CompletionStage<Result>, WSRequest>>map(url -> Either.right(wsClient.url(url.toString())))
            .orElseGet(() -> Either.left(wrapAsPromise(internalServerError())));
    }
}
