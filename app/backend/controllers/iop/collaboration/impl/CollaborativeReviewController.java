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

import java.net.MalformedURLException;
import java.net.URL;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import javax.inject.Inject;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.Logger;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;

import backend.controllers.iop.collaboration.api.CollaborativeExamLoader;
import backend.models.Exam;
import backend.models.Grade;
import backend.models.Role;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.models.questions.ClozeTestAnswer;
import backend.models.questions.Question;
import backend.util.JsonDeserializer;

public class CollaborativeReviewController extends CollaborationController {

    @Inject
    CollaborativeExamLoader examLoader;

    @Inject
    WSClient wsClient;

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

    private Result handleRemoteResponse(WSResponse response, boolean processAnswers) {
        JsonNode root = response.asJson();
        if (response.getStatus() != OK) {
            return internalServerError(root.get("message").asText("Connection refused"));
        }
        JsonNode examNode = root.get("exam");
        if (processAnswers) {
            // Manipulate cloze test answers so that they can be conveniently displayed for review
            stream(examNode.get("examSections"))
                    .flatMap(es -> stream(es.get("sectionQuestions")))
                    .filter(esq -> esq.get("question").get("type").textValue().equals(Question.Type.ClozeTestQuestion.toString()))
                    .forEach(esq -> {
                        if (!esq.get("clozeTestAnswer").isObject()) {
                            ((ObjectNode) esq).set("clozeTestAnswer", Json.newObject());
                        }
                        ClozeTestAnswer cta = JsonDeserializer.deserialize(
                                ClozeTestAnswer.class, esq.get("clozeTestAnswer"));
                        cta.setQuestionWithResults(esq);
                        ((ObjectNode) esq).set("clozeTestAnswer", serialize(cta));
                    });
        }
        return ok(root);
    }

    private Stream<JsonNode> stream(JsonNode node) {
        return StreamSupport.stream(node.spliterator(), false);
    }

    private void scoreAnswer(JsonNode examNode, Long qid, Double score) {
        stream(examNode.get("examSections"))
                .flatMap(es -> stream(es.get("sectionQuestions")))
                .filter(esq -> esq.get("id").asLong() == qid)
                .findAny()
                .ifPresent(esq -> {
                    JsonNode essayAnswer = esq.get("essayAnswer");
                    if (essayAnswer.isObject()) {
                        ((ObjectNode) essayAnswer).put("evaluatedScore", score);
                    } else {
                        ((ObjectNode) essayAnswer).set("essayAnswer",
                                Json.newObject().put("evaluatedScore", score));
                    }
                });
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
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
        return request.get().thenApplyAsync(resp -> handleRemoteResponse(resp, false));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
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
        return request.get().thenApplyAsync(resp -> handleRemoteResponse(resp, true));
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
            if (!isAuthorizedToView(exam, user, loginRole)) {
                return wrapAsPromise(forbidden("You are not allowed to modify this object"));
            }
            if (exam.hasState(Exam.State.ABORTED, Exam.State.REJECTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
                return wrapAsPromise(forbidden("Not allowed to update grading of this exam"));
            }
            JsonNode grade = body.get("grade");
            if (grade.isObject()) {
                boolean validGrade = exam.getGradeScale().getGrades().stream()
                        .map(Grade::getId)
                        .anyMatch(i -> i == grade.get("id").asInt());
                if (validGrade) {
                    ((ObjectNode) examNode).set("grade", grade);
                } else {
                    return wrapAsPromise(badRequest("Invalid grade for this grade scale"));
                }
            } else if (body.get("gradeless").asBoolean(false)){
                ((ObjectNode)examNode).set("grade", NullNode.getInstance());
                ((ObjectNode)examNode).put("gradeless", true);
            } else {
                ((ObjectNode)examNode).set("grade", NullNode.getInstance());
            }
            JsonNode creditType = body.get("creditType");
            ((ObjectNode)examNode).set("creditType", creditType);
            ((ObjectNode)examNode).put("additionalInfo", body.get("additionalInfo").asText());
            ((ObjectNode)examNode).put("answerLanguage", body.get("answerLanguage").asText());
            ((ObjectNode)examNode).put("customCredit", body.get("customCredit").asDouble());

            Exam.State newState = Exam.State.valueOf(body.get("state").asText());
            ((ObjectNode)examNode).put("state", newState.toString());
            if (newState == Exam.State.GRADED || newState == Exam.State.GRADED_LOGGED) {
                String gradedTime =  ISODateTimeFormat.dateTime().print(DateTime.now());
                ((ObjectNode)examNode).put("gradedTime", gradedTime);
                ((ObjectNode)examNode).set("gradedByUser", serialize(user));
            }

            return upload(url.get(), root);
        };
        return request.get().thenComposeAsync(onSuccess);
    }



}
