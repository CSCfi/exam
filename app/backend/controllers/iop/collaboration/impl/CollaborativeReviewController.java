/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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
 */

package backend.controllers.iop.collaboration.impl;

import backend.models.Exam;
import backend.models.Grade;
import backend.models.Role;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.models.questions.ClozeTestAnswer;
import backend.models.questions.Question;
import backend.sanitizers.Attrs;
import backend.sanitizers.ExternalRefCollectionSanitizer;
import backend.system.interceptors.Anonymous;
import backend.util.JsonDeserializer;
import backend.util.csv.CsvBuilder;
import backend.util.file.FileHandler;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import org.springframework.util.StringUtils;
import play.Logger;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;
import play.mvc.With;

import javax.inject.Inject;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Collection;
import java.util.Iterator;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;

public class CollaborativeReviewController extends CollaborationController {

    @Inject
    WSClient wsClient;

    @Inject
    CsvBuilder csvBuilder;

    @Inject
    FileHandler fileHandler;

    private Optional<URL> parseUrl(String examRef, String assessmentRef) {
        String url = String.format("%s/api/exams/%s/assessments",
                ConfigFactory.load().getString("sitnet.integration.iop.host"), examRef);
        if (assessmentRef != null) {
            url += String.format("/%s", assessmentRef);
        }
        try {
            return Optional.of(new URL(url));
        } catch (MalformedURLException e) {
            Logger.error("Malformed URL {}", e);
            return Optional.empty();
        }
    }

    private Result handleSingleAssessmentResponse(WSResponse response, boolean admin) {
        JsonNode root = response.asJson();
        if (response.getStatus() != OK) {
            return internalServerError(root.get("message").asText("Connection refused"));
        }
        JsonNode examNode = root.get("exam");

        // Manipulate cloze test answers so that they can be conveniently displayed for review
        stream(examNode.get("examSections"))
                .flatMap(es -> stream(es.get("sectionQuestions")))
                .filter(esq -> esq.get("question").get("type").textValue().equals(
                        Question.Type.ClozeTestQuestion.toString()))
                .forEach(esq -> {
                    if (!esq.get("clozeTestAnswer").isObject() || esq.get("clozeTestAnswer").size() == 0) {
                        ((ObjectNode) esq).set("clozeTestAnswer", Json.newObject());
                    }
                    ClozeTestAnswer cta = JsonDeserializer.deserialize(
                            ClozeTestAnswer.class, esq.get("clozeTestAnswer"));
                    cta.setQuestionWithResults(esq);
                    ((ObjectNode) esq).set("clozeTestAnswer", serialize(cta));
                });

        return writeAnonymousResult(ok(root), true, admin);
    }

    private Result handleMultipleAssesmentResponse(WSResponse response, boolean admin) {
        JsonNode root = response.asJson();
        if (response.getStatus() != OK) {
            return internalServerError(root.get("message").asText("Connection refused"));
        }
        // calculate scores
        calculateScores(root);
        return writeAnonymousResult(ok(root), true, admin);
    }

    private void scoreAnswer(JsonNode examNode, Long qid, Double score) {
        stream(examNode.get("examSections"))
                .flatMap(es -> stream(es.get("sectionQuestions")))
                .filter(esq -> esq.get("id").asLong() == qid)
                .findAny()
                .ifPresent(esq -> {
                    JsonNode essayAnswer = esq.get("essayAnswer");
                    if (essayAnswer.isObject() && essayAnswer.size() > 0) {
                        ((ObjectNode) essayAnswer).put("evaluatedScore", score);
                    } else {
                        ((ObjectNode) essayAnswer).set("essayAnswer",
                                Json.newObject().put("evaluatedScore", score));
                    }
                });
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    @Anonymous(filteredProperties = {"user"})
    public CompletionStage<Result> listAssessments(Long id) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        Optional<URL> url = parseUrl(ce.getExternalRef(), null);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        WSRequest request = wsClient.url(url.get().toString());
        final boolean admin = isUserAdmin();
        return request.get().thenApplyAsync(response -> handleMultipleAssesmentResponse(response, admin));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    @Anonymous(filteredProperties = {"user", "preEnrolledUserEmail", "grade"})
    public CompletionStage<Result> getParticipationsForExamAndUser(Long eid, String aid) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, eid);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        Optional<URL> url = parseUrl(ce.getExternalRef(), null);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        WSRequest request = wsClient.url(url.get().toString());
        final boolean admin = isUserAdmin();
        return request.get().thenApplyAsync(response -> {
            if (response.getStatus() != 200) {
                return Results.status(response.getStatus());
            }
            final JsonNode root = response.asJson();
            final Optional<JsonNode> assessment = stream(root).filter(node -> node.path("_id").asText().equals(aid))
                    .findFirst();
            if (!assessment.isPresent()) {
                return Results.notFound("Assessment not found!");
            }
            final String eppn = assessment.get().path("user").path("eppn").textValue();
            if (StringUtils.isEmpty(eppn)) {
                return Results.notFound("Eppn not found!");
            }
            // Filter for user eppn and left out assessment that we currently are looking.
            final Iterator<JsonNode> it = root.iterator();
            while (it.hasNext()) {
                JsonNode node = it.next();
                if (!node.path("user").path("eppn").asText().equals(eppn)
                        || node.path("_id").asText().equals(aid)) {
                    it.remove();
                }
            }
            return writeAnonymousResult(ok(root), true, admin);
        });
    }

    private boolean isFinished(JsonNode exam) {
        return exam.get("state").asText().equals(Exam.State.GRADED_LOGGED.toString()) &&
                !exam.path("gradeless").asBoolean() &&
                exam.get("grade").has("name") &&
                exam.has("gradedByUser") &&
                exam.has("customCredit");
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

    @With(ExternalRefCollectionSanitizer.class)
    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public CompletionStage<Result> exportAssessments(Long id) {
        Collection<String> refs = request().attrs().get(Attrs.REF_COLLECTION);
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        Optional<URL> url = parseUrl(ce.getExternalRef(), null);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        WSRequest request = wsClient.url(url.get().toString());
        Http.Response responseCtx = response();
        return request.get().thenApplyAsync(response -> {
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
                return internalServerError("sitnet_error_creating_csv_file");
            }
            fileHandler.setContentType(file, responseCtx);
            return ok(fileHandler.encodeFile(file));
        });
    }


    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    @Anonymous(filteredProperties = {"user"})
    public CompletionStage<Result> getAssessment(Long id, String ref) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        Optional<URL> url = parseUrl(ce.getExternalRef(), ref);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        WSRequest request = wsClient.url(url.get().toString());
        final boolean admin = isUserAdmin();
        return request.get().thenApplyAsync(response -> handleSingleAssessmentResponse(response, admin));
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

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> updateAnswerScore(Long id, String ref, Long qid) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        Optional<URL> url = parseUrl(ce.getExternalRef(), ref);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        JsonNode body = request().body().asJson();
        String input = body.get("evaluatedScore").asText();
        Double score = input == null ? null : Double.parseDouble(input);
        String revision = body.get("rev").asText();
        WSRequest request = wsClient.url(url.get().toString());
        Function<WSResponse, CompletionStage<Result>> onSuccess = (response) -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != OK) {
                return wrapAsPromise(internalServerError(root.get("message").asText("Connection refused")));
            }
            scoreAnswer(root.get("exam"), qid, score);
            ((ObjectNode) root).put("rev", revision);
            return upload(url.get(), root);
        };
        return request.get().thenComposeAsync(onSuccess);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> updateAssessment(Long id, String ref) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        Optional<URL> url = parseUrl(ce.getExternalRef(), ref);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        JsonNode body = request().body().asJson();
        User user = getLoggedUser();
        final Role.Name loginRole = Role.Name.valueOf(getSession().getLoginRole());

        WSRequest request = wsClient.url(url.get().toString());
        Function<WSResponse, CompletionStage<Result>> onSuccess = (response) -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != OK) {
                return wrapAsPromise(internalServerError(root.get("message").asText("Connection refused")));
            }
            JsonNode examNode = root.get("exam");
            Exam exam = JsonDeserializer.deserialize(Exam.class, examNode);
            if (!isAuthorizedToAssess(exam, user, loginRole)) {
                return wrapAsPromise(forbidden("You are not allowed to modify this object"));
            }
            if (exam.hasState(Exam.State.ABORTED, Exam.State.REJECTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
                return wrapAsPromise(forbidden("Not allowed to update grading of this exam"));
            }
            JsonNode grade = body.get("grade");
            if (grade != null && grade.isObject() && grade.size() > 0) {
                boolean validGrade = exam.getGradeScale().getGrades().stream()
                        .map(Grade::getId)
                        .anyMatch(i -> i == grade.get("id").asInt());
                if (validGrade) {
                    ((ObjectNode) examNode).set("grade", grade);
                } else {
                    return wrapAsPromise(badRequest("Invalid grade for this grade scale"));
                }
            } else if (body.path("gradeless").asBoolean(false)) {
                ((ObjectNode) examNode).set("grade", NullNode.getInstance());
                ((ObjectNode) examNode).put("gradeless", true);
            } else {
                ((ObjectNode) examNode).set("grade", NullNode.getInstance());
            }
            JsonNode creditType = body.get("creditType");
            ((ObjectNode) examNode).set("creditType", creditType);
            ((ObjectNode) examNode).put("additionalInfo", body.path("additionalInfo")
                    .asText(null));
            ((ObjectNode) examNode).put("answerLanguage", body.path("answerLanguage")
                    .asText(null));
            ((ObjectNode) examNode).put("customCredit", body.path("customCredit").isMissingNode() ? null :
                    body.path("customCredit").doubleValue());

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
        return request.get().thenComposeAsync(onSuccess);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> addComment(Long id, String ref) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        Optional<URL> url = parseUrl(ce.getExternalRef(), ref);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        JsonNode body = request().body().asJson();
        String revision = body.get("rev").asText();
        WSRequest request = wsClient.url(url.get().toString());
        Function<WSResponse, CompletionStage<Result>> onSuccess = (response) -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != OK) {
                return wrapAsPromise(internalServerError(root.get("message").asText("Connection refused")));
            }
            JsonNode examNode = root.get("exam");
            ((ObjectNode) examNode).set("examFeedback",
                    Json.newObject().put("comment", body.get("comment").asText()));
            ((ObjectNode) root).put("rev", revision);
            return upload(url.get(), root);
        };
        return request.get().thenComposeAsync(onSuccess);
    }

    @Restrict({@Group("TEACHER")})
    public CompletionStage<Result> updateAssessmentInfo(Long id, String ref) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        Optional<URL> url = parseUrl(ce.getExternalRef(), ref);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        User user = getLoggedUser();
        Role.Name loginRole = Role.Name.valueOf(getSession().getLoginRole());
        JsonNode body = request().body().asJson();
        String revision = body.get("rev").asText();
        WSRequest request = wsClient.url(url.get().toString());
        Function<WSResponse, CompletionStage<Result>> onSuccess = (response) -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != OK) {
                return wrapAsPromise(internalServerError(root.get("message").asText("Connection refused")));
            }
            JsonNode examNode = root.get("exam");
            Exam exam = JsonDeserializer.deserialize(Exam.class, examNode);
            if (!isAuthorizedToAssess(exam, user, loginRole)) {
                return wrapAsPromise(forbidden("You are not allowed to modify this object"));
            }
            if (!exam.hasState(Exam.State.GRADED_LOGGED)) {
                return wrapAsPromise(forbidden("Not allowed to update grading of this exam"));
            }
            ((ObjectNode) examNode).put("assessmentInfo", body.get("assessmentInfo").asText());
            ((ObjectNode) root).put("rev", revision);
            return upload(url.get(), root);
        };
        return request.get().thenComposeAsync(onSuccess);
    }

    private Optional<CompletionStage<Result>> validateExamState(Exam exam, boolean gradeRequired, User user,
                                                                Role.Name loginRole) {
        if (exam == null) {
            return Optional.of(wrapAsPromise(notFound()));
        }
        if (!isAuthorizedToAssess(exam, user, loginRole)) {
            return Optional.of(wrapAsPromise(forbidden("You are not allowed to modify this object")));
        }
        if ((exam.getGrade() == null && gradeRequired) || exam.getCreditType() == null || exam.getAnswerLanguage() == null ||
                exam.getGradedByUser() == null) {
            return Optional.of(wrapAsPromise(forbidden("not yet graded by anyone!")));
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) ||
                exam.getExamRecord() != null) {
            return Optional.of(wrapAsPromise(forbidden("sitnet_error_exam_already_graded_logged")));
        }
        return Optional.empty();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> finalizeAssessment(Long id, String ref) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        Optional<URL> url = parseUrl(ce.getExternalRef(), ref);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        User user = getLoggedUser();
        Role.Name loginRole = Role.Name.valueOf(getSession().getLoginRole());
        JsonNode body = request().body().asJson();
        String revision = body.path("rev").asText(null);
        if (revision == null) {
            return wrapAsPromise(badRequest());
        }
        Boolean gradeless = body.path("gradeless").asBoolean(false);
        WSRequest request = wsClient.url(url.get().toString());
        Function<WSResponse, CompletionStage<Result>> onSuccess = (response) -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != OK) {
                return wrapAsPromise(internalServerError(root.get("message")
                        .asText("Connection refused")));
            }
            JsonNode examNode = root.get("exam");
            Exam exam = JsonDeserializer.deserialize(Exam.class, examNode);
            return validateExamState(exam, !gradeless, user, loginRole).orElseGet(() -> {
                ((ObjectNode) examNode).put("state", Exam.State.GRADED_LOGGED.toString());
                if (exam.getGradedByUser() == null && exam.getAutoEvaluationConfig() != null) {
                    // Automatically graded by system, set graded by user at this point.
                    ((ObjectNode) examNode).set("gradedByUser", serialize(user));
                }
                if (gradeless) {
                    ((ObjectNode) examNode).put("gradeless", true);
                    ((ObjectNode) examNode).set("grade", NullNode.getInstance());
                }
                ((ObjectNode) root).put("rev", revision);
                return upload(url.get(), root);
            });
        };
        return request.get().thenComposeAsync(onSuccess);
    }

}
