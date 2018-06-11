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

package backend.controllers.iop.collaboration;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import javax.inject.Inject;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.Json;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Result;
import play.mvc.With;

import backend.controllers.base.BaseController;
import backend.impl.EmailComposer;
import backend.impl.ExamUpdater;
import backend.models.Exam;
import backend.models.ExamExecutionType;
import backend.models.ExamSection;
import backend.models.ExamType;
import backend.models.GradeScale;
import backend.models.Language;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.sanitizers.ExamUpdateSanitizer;
import backend.util.AppUtil;
import backend.util.ConfigUtil;


public class CollaborativeExamController extends BaseController {

    @Inject
    private WSClient wsClient;

    @Inject
    private EmailComposer composer;

    @Inject
    private ActorSystem actorSystem;

    @Inject
    private ExamUpdater examUpdater;


    private CompletionStage<Optional<Exam>> downloadExam(CollaborativeExam ce) {
        Optional<URL> url = parseUrl(ce.getExternalRef());
        if (url.isPresent()) {
            WSRequest request = wsClient.url(url.get().toString());
            Function<WSResponse, Optional<Exam>> onSuccess = response -> {
                JsonNode root = response.asJson();
                if (response.getStatus() != OK) {
                    Logger.warn("non-ok response from XM: {}", root.get("message").asText());
                    return Optional.empty();
                }
                return Optional.of(ce.getExam(root));
            };
            return request.get().thenApplyAsync(onSuccess);
        }
        return CompletableFuture.supplyAsync(Optional::empty);
    }

    private CompletionStage<Result> uploadExam(CollaborativeExam ce, Exam content) {
        Optional<URL> url = parseUrl(ce.getExternalRef());
        if (url.isPresent()) {
            WSRequest request = wsClient.url(url.toString());
            Function<WSResponse, Result> onSuccess = response -> {
                JsonNode root = response.asJson();
                if (response.getStatus() != OK) {
                    return internalServerError(root.get("message").asText());
                }
                return ok();
            };
            return request.put(serialize(content)).thenApplyAsync(onSuccess);
        }
        return wrapAsPromise(internalServerError());
    }

    private Exam prepareDraft() {
        ExamExecutionType examExecutionType = Ebean.find(ExamExecutionType.class)
                .where()
                .eq("type", ExamExecutionType.Type.PUBLIC.toString())
                .findUnique();
        User user = getLoggedUser();
        Exam exam = new Exam();
        exam.setState(Exam.State.DRAFT);
        exam.setExecutionType(examExecutionType);
        AppUtil.setCreator(exam, user);

        ExamSection examSection = new ExamSection();
        AppUtil.setCreator(examSection, user);

        examSection.setExam(exam);
        examSection.setExpanded(true);
        examSection.setSequenceNumber(0);

        exam.getExamSections().add(examSection);
        exam.getExamLanguages().add(Ebean.find(Language.class, "fi"));
        exam.setExamType(Ebean.find(ExamType.class, 2)); // Final

        DateTime start = DateTime.now().withTimeAtStartOfDay();
        exam.setExamActiveStartDate(start);
        exam.setExamActiveEndDate(start.plusDays(1));
        exam.setDuration(ConfigUtil.getExamDurations().get(0)); // check
        exam.setGradeScale(Ebean.find(GradeScale.class).findList().get(0)); // check

        exam.getExamOwners().add(getLoggedUser());
        exam.setTrialCount(1);
        exam.setExpanded(true);

        return exam;
    }

    private JsonNode serialize(Exam exam) {
        ObjectMapper mapper = new ObjectMapper();
        try {
            String json = mapper.writeValueAsString(exam);
            return mapper.readTree(json);
        } catch (IOException e) {
            Logger.error("unable to serialize");
            throw new RuntimeException(e);
        }
   }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public CompletionStage<Result> listExams() {
        Optional<URL> url = parseUrl(null);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        WSRequest request = wsClient.url(url.get().toString());
        Function<WSResponse, Result> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != OK) {
                return internalServerError(root.get("message").asText("Connection refused"));
            }

            Map<String, CollaborativeExam> locals = Ebean.find(CollaborativeExam.class).findSet().stream()
                    .collect(Collectors.toMap(CollaborativeExam::getExternalRef, Function.identity()));

            // Store references to all exams locally if not already done so
            StreamSupport.stream(root.spliterator(), false)
                    .filter(node -> !locals.keySet().contains(node.get("_id").asText()))
                    .forEach(node -> {
                        String ref = node.get("_id").asText();
                        CollaborativeExam ce = new CollaborativeExam();
                        ce.setExternalRef(ref);
                        ce.setCreated(DateTime.now());
                        ce.save();
                        locals.put(ref, ce);
                    });

            Map<CollaborativeExam, JsonNode> localToExternal = StreamSupport.stream(root.spliterator(), false)
                    .collect(Collectors.toMap(node -> locals.get(node.get("_id").asText()), Function.identity()));
            List<JsonNode> exams = localToExternal.entrySet().stream()
                    .map(e -> e.getKey().getExam(e.getValue()))
                    .map(this::serialize)
                    .collect(Collectors.toList());

            return ok(Json.newArray().addAll(exams));
        };
        return request.get().thenApplyAsync(onSuccess);
    }

    @Restrict({@Group("ADMIN")})
    public CompletionStage<Result> getExam(Long id) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        return downloadExam(ce).thenApplyAsync(
                result -> result.isPresent() ? ok(serialize(result.get())) : notFound("sitnet_error_exam_not_found")
        );
    }

    @Restrict({@Group("ADMIN")})
    public CompletionStage<Result> createExam() throws IOException {
        Optional<URL> url = parseUrl(null);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        WSRequest request = wsClient.url(url.get().toString());
        Function<WSResponse, Result> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != CREATED) {
                return internalServerError(root.get("message").asText("Connection refused"));
            }
            String externalRef = root.get("id").asText();
            CollaborativeExam ce = new CollaborativeExam();
            ce.setExternalRef(externalRef);
            ce.setCreated(DateTime.now());
            ce.save();
            return created(Json.newObject().put("id", ce.getId()));
        };
        Exam body = prepareDraft();
        return request.post(serialize(body)).thenApplyAsync(onSuccess);
    }

    @Restrict({@Group("ADMIN")})
    public CompletionStage<Result> deleteExam(Long id) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        return downloadExam(ce).thenApplyAsync(result -> {
            if (result.isPresent()) {
                Exam exam = result.get();
                if (!exam.getState().equals(Exam.State.PUBLISHED)) {
                    return forbidden("sitnet_exam_removal_not_possible");
                }
                ce.delete();
                return ok();
            }
            return notFound("sitnet_error_exam_not_found");
        });
    }

    @With(ExamUpdateSanitizer.class)
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public CompletionStage<Result> updateExam(Long id) {
        CollaborativeExam ce = Ebean.find(CollaborativeExam.class, id);
        if (ce == null) {
            return wrapAsPromise(notFound("sitnet_error_exam_not_found"));
        }
        User user = getLoggedUser();
        return downloadExam(ce).thenCompose(result -> {
            if (result.isPresent()) {
                Exam exam = result.get();
                if (exam.isOwnedOrCreatedBy(user)) {
                    Optional<Result> error = Stream.of(
                            examUpdater.updateTemporalFieldsAndValidate(exam, user, request(), getSession()),
                            examUpdater.updateStateAndValidate(exam, user, request()))
                            .filter(Optional::isPresent)
                            .map(Optional::get)
                            .findFirst();
                    return error.isPresent() ? wrapAsPromise(error.get()) : uploadExam(ce, exam);
                }
                return wrapAsPromise(forbidden("sitnet_error_access_forbidden"));
            }
            return wrapAsPromise(notFound());
        });
    }

    private static Optional<URL> parseUrl(String examRef) {
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


}
