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

package controllers.iop.collaboration.impl;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import impl.EmailComposer;
import io.ebean.DB;
import java.net.URL;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.inject.Inject;
import models.Exam;
import models.ExamExecutionType;
import models.ExamType;
import models.GradeScale;
import models.Language;
import models.User;
import models.json.CollaborativeExam;
import models.sections.ExamSection;
import org.apache.pekko.actor.ActorSystem;
import org.joda.time.DateTime;
import play.libs.Json;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.EmailSanitizer;
import sanitizers.ExamUpdateSanitizer;
import scala.concurrent.duration.Duration;
import security.Authenticated;
import util.config.ConfigReader;

public class CollaborativeExamController extends CollaborationController {

    @Inject
    private ConfigReader configReader;

    @Inject
    private ActorSystem as;

    @Inject
    private EmailComposer composer;

    private Exam prepareDraft(User user) {
        ExamExecutionType examExecutionType = DB.find(ExamExecutionType.class)
            .where()
            .eq("type", ExamExecutionType.Type.PUBLIC.toString())
            .findOne();
        Exam exam = new Exam();
        exam.generateHash();
        exam.setState(Exam.State.DRAFT);
        exam.setExecutionType(examExecutionType);
        cleanUser(user);
        exam.setCreatorWithDate(user);

        ExamSection examSection = new ExamSection();
        examSection.setCreatorWithDate(user);

        examSection.setId(newId());
        examSection.setExam(exam);
        examSection.setExpanded(true);
        examSection.setSequenceNumber(0);

        exam.getExamSections().add(examSection);
        exam.getExamLanguages().add(DB.find(Language.class, "fi"));
        exam.setExamType(DB.find(ExamType.class, 2)); // Final

        DateTime start = DateTime.now().withTimeAtStartOfDay();
        exam.setPeriodStart(start);
        exam.setPeriodEnd(start.plusDays(1));
        exam.setDuration(configReader.getExamDurations().get(0)); // check
        exam.setGradeScale(DB.find(GradeScale.class).findList().get(0)); // check

        exam.setTrialCount(1);
        exam.setAnonymous(true);

        return exam;
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public CompletionStage<Result> searchExams(Http.Request request, final Optional<String> filter) {
        Optional<URL> url = filter.orElse("").isEmpty() ? parseUrl() : parseUrlWithSearchParam(filter.get(), false);
        if (url.isEmpty()) {
            return wrapAsPromise(internalServerError("i18n_internal_error"));
        }

        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        WSRequest wsRequest = wsClient.url(url.get().toString());
        String homeOrg = configReader.getHomeOrganisationRef();

        Function<WSResponse, Result> onSuccess = response ->
            findExamsToProcess(response)
                .map(items -> {
                    List<JsonNode> exams = items
                        .entrySet()
                        .stream()
                        .map(e -> e.getKey().getExam(e.getValue()))
                        .filter(e -> isAuthorizedToView(e, user, homeOrg))
                        .map(this::serialize)
                        .toList();

                    return ok(Json.newArray().addAll(exams));
                })
                .getOrElseGet(Function.identity());

        return wsRequest.get().thenApplyAsync(onSuccess);
    }

    private CompletionStage<Result> getExam(Long id, Consumer<Exam> postProcessor, User user) {
        String homeOrg = configReader.getHomeOrganisationRef();
        return findCollaborativeExam(id)
            .map(ce ->
                downloadExam(ce).thenApplyAsync(result -> {
                    if (result.isEmpty()) {
                        return notFound("i18n_error_exam_not_found");
                    }
                    Exam exam = result.get();
                    if (!isAuthorizedToView(exam, user, homeOrg)) {
                        return notFound("i18n_error_exam_not_found");
                    }
                    postProcessor.accept(exam);
                    return ok(serialize(exam));
                }))
            .getOrElseGet(Function.identity());
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public Result listGradeScales() {
        Set<GradeScale> grades = DB.find(GradeScale.class).fetch("grades").where().isNull("externalRef").findSet();
        return ok(grades);
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public CompletionStage<Result> getExam(Long id, Http.Request request) {
        return getExam(id, exam -> {}, request.attrs().get(Attrs.AUTHENTICATED_USER));
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public CompletionStage<Result> getExamPreview(Long id, Http.Request request) {
        return getExam(id, exam -> examUpdater.preparePreview(exam), request.attrs().get(Attrs.AUTHENTICATED_USER));
    }

    @Authenticated
    @Restrict({ @Group("ADMIN") })
    public CompletionStage<Result> createExam(Http.Request request) {
        Optional<URL> url = parseUrl();
        if (url.isEmpty()) {
            return wrapAsPromise(internalServerError());
        }
        WSRequest wsRequest = wsClient.url(url.get().toString());
        Function<WSResponse, Result> onSuccess = response -> {
            JsonNode root = response.asJson();
            if (response.getStatus() != CREATED) {
                return internalServerError(root.get("message").asText("Connection refused"));
            }
            String externalRef = root.get("id").asText();
            String revision = root.get("rev").asText();
            CollaborativeExam ce = new CollaborativeExam();
            ce.setExternalRef(externalRef);
            ce.setRevision(revision);
            ce.setCreated(DateTime.now());
            ce.setAnonymous(true);
            ce.save();
            return created(Json.newObject().put("id", ce.getId()));
        };
        Exam body = prepareDraft(request.attrs().get(Attrs.AUTHENTICATED_USER));
        return wsRequest.post(serialize(body)).thenApplyAsync(onSuccess);
    }

    @Restrict({ @Group("ADMIN") })
    public CompletionStage<Result> deleteExam(Long id) {
        return findCollaborativeExam(id)
            .map(ce -> {
                if (!ce.getState().equals(Exam.State.DRAFT) && !ce.getState().equals(Exam.State.PRE_PUBLISHED)) {
                    return wrapAsPromise(forbidden("i18n_exam_removal_not_possible"));
                }
                return examLoader
                    .deleteExam(ce)
                    .thenApplyAsync(result -> {
                        if (result.status() == OK) {
                            ce.delete();
                        }
                        return result;
                    });
            })
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @With(ExamUpdateSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public CompletionStage<Result> updateExam(Long id, Http.Request request) {
        String homeOrg = configReader.getHomeOrganisationRef();
        return findCollaborativeExam(id)
            .map(ce -> {
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                return downloadExam(ce).thenComposeAsync(result -> {
                    if (result.isPresent()) {
                        Exam exam = result.get();
                        if (isAuthorizedToView(exam, user, homeOrg)) {
                            Exam.State previousState = exam.getState();
                            Optional<Result> error = Stream.of(
                                examUpdater.updateTemporalFieldsAndValidate(exam, user, request),
                                examUpdater.updateStateAndValidate(exam, user, request)
                            )
                                .filter(Optional::isPresent)
                                .map(Optional::get)
                                .findFirst();
                            if (error.isPresent()) {
                                return wrapAsPromise(error.get());
                            }
                            Exam.State nextState = exam.getState();
                            boolean isPrePublication =
                                previousState != Exam.State.PRE_PUBLISHED && nextState == Exam.State.PRE_PUBLISHED;
                            examUpdater.update(exam, request, user.getLoginRole());
                            return uploadExam(ce, exam, user).thenApplyAsync(result2 -> {
                                if (result2.status() == OK && isPrePublication) {
                                    Set<String> receivers = exam
                                        .getExamOwners()
                                        .stream()
                                        .map(User::getEmail)
                                        .collect(Collectors.toSet());
                                    as
                                        .scheduler()
                                        .scheduleOnce(
                                            Duration.create(1, TimeUnit.SECONDS),
                                            () -> composer.composeCollaborativeExamAnnouncement(receivers, user, exam),
                                            as.dispatcher()
                                        );
                                }
                                return result2;
                            });
                        }
                        return wrapAsPromise(forbidden("i18n_error_access_forbidden"));
                    }
                    return wrapAsPromise(notFound());
                });
            })
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("ADMIN") })
    public CompletionStage<Result> updateLanguage(Long id, String code, Http.Request request) {
        return findCollaborativeExam(id)
            .map(ce -> {
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                return downloadExam(ce).thenComposeAsync(result -> {
                    if (result.isPresent()) {
                        Exam exam = result.get();
                        Optional<Result> error = examUpdater.updateLanguage(exam, code, user);
                        return error.isPresent() ? wrapAsPromise(error.get()) : uploadExam(ce, exam, user);
                    }
                    return wrapAsPromise(notFound());
                });
            })
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @With(EmailSanitizer.class)
    @Restrict({ @Group("ADMIN") })
    public CompletionStage<Result> addOwner(Long id, Http.Request request) {
        return findCollaborativeExam(id)
            .map(ce -> {
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                return downloadExam(ce).thenComposeAsync(result -> {
                    if (result.isPresent()) {
                        Exam exam = result.get();
                        User owner = createOwner(request.attrs().get(Attrs.EMAIL));
                        exam.getExamOwners().add(owner);
                        return uploadExam(ce, exam, user, owner, null);
                    }
                    return wrapAsPromise(notFound());
                });
            })
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("ADMIN") })
    public CompletionStage<Result> removeOwner(Long id, Long oid, Http.Request request) {
        return findCollaborativeExam(id)
            .map(ce -> {
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                return downloadExam(ce).thenComposeAsync(result -> {
                    if (result.isPresent()) {
                        Exam exam = result.get();
                        User owner = new User();
                        owner.setId(oid);
                        exam.getExamOwners().remove(owner);
                        return uploadExam(ce, exam, user);
                    }
                    return wrapAsPromise(notFound());
                });
            })
            .getOrElseGet(Function.identity());
    }

    private User createOwner(String email) {
        User user = new User();
        user.setId(newId());
        user.setEmail(email);
        return user;
    }
}
