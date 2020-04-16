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

import akka.actor.ActorSystem;
import backend.impl.EmailComposer;
import backend.models.Exam;
import backend.models.ExamExecutionType;
import backend.models.ExamType;
import backend.models.GradeScale;
import backend.models.Language;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.models.sections.ExamSection;
import backend.sanitizers.Attrs;
import backend.sanitizers.EmailSanitizer;
import backend.sanitizers.ExamUpdateSanitizer;
import backend.security.Authenticated;
import backend.util.AppUtil;
import backend.util.config.ConfigReader;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.Ebean;
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
import org.joda.time.DateTime;
import play.libs.Json;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import scala.concurrent.duration.Duration;

public class CollaborativeExamController extends CollaborationController {
  @Inject
  private ConfigReader configReader;

  @Inject
  private ActorSystem as;

  @Inject
  private EmailComposer composer;

  private Exam prepareDraft(User user) {
    ExamExecutionType examExecutionType = Ebean
      .find(ExamExecutionType.class)
      .where()
      .eq("type", ExamExecutionType.Type.PUBLIC.toString())
      .findOne();
    Exam exam = new Exam();
    exam.generateHash();
    exam.setState(Exam.State.DRAFT);
    exam.setExecutionType(examExecutionType);
    cleanUser(user);
    AppUtil.setCreator(exam, user);

    ExamSection examSection = new ExamSection();
    AppUtil.setCreator(examSection, user);

    examSection.setId(newId());
    examSection.setExam(exam);
    examSection.setExpanded(true);
    examSection.setSequenceNumber(0);

    exam.getExamSections().add(examSection);
    exam.getExamLanguages().add(Ebean.find(Language.class, "fi"));
    exam.setExamType(Ebean.find(ExamType.class, 2)); // Final

    DateTime start = DateTime.now().withTimeAtStartOfDay();
    exam.setExamActiveStartDate(start);
    exam.setExamActiveEndDate(start.plusDays(1));
    exam.setDuration(configReader.getExamDurations().get(0)); // check
    exam.setGradeScale(Ebean.find(GradeScale.class).findList().get(0)); // check

    exam.setTrialCount(1);
    exam.setExpanded(true);
    exam.setAnonymous(true);

    return exam;
  }

  @Authenticated
  @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
  public CompletionStage<Result> listExams(Http.Request request) {
    Optional<URL> url = parseUrl();
    if (url.isEmpty()) {
      return wrapAsPromise(internalServerError());
    }
    User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
    WSRequest wsRequest = wsClient.url(url.get().toString());

    Function<WSResponse, Result> onSuccess = response ->
      findExamsToProcess(response)
        .map(
          items -> {
            List<JsonNode> exams = items
              .entrySet()
              .stream()
              .map(e -> e.getKey().getExam(e.getValue()))
              .filter(e -> isAuthorizedToView(e, user))
              .map(this::serialize)
              .collect(Collectors.toList());

            return ok(Json.newArray().addAll(exams));
          }
        )
        .getOrElseGet(Function.identity());

    return wsRequest.get().thenApplyAsync(onSuccess);
  }

  @Authenticated
  @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
  public CompletionStage<Result> searchExams(Http.Request request, final Optional<String> filter) {
    if (filter.isEmpty() || filter.get().isEmpty()) {
      return wrapAsPromise(badRequest());
    }

    Optional<URL> url = parseUrlWithSearchParam(filter.get(), false);
    if (url.isEmpty()) {
      return wrapAsPromise(internalServerError("sitnet_internal_error"));
    }

    User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
    WSRequest wsRequest = wsClient.url(url.get().toString());

    Function<WSResponse, Result> onSuccess = response ->
      findExamsToProcess(response)
        .map(
          items -> {
            List<JsonNode> exams = items
              .entrySet()
              .stream()
              .map(e -> e.getKey().getExam(e.getValue()))
              .filter(e -> isAuthorizedToView(e, user))
              .map(this::serialize)
              .collect(Collectors.toList());

            return ok(Json.newArray().addAll(exams));
          }
        )
        .getOrElseGet(Function.identity());

    return wsRequest.get().thenApplyAsync(onSuccess);
  }

  private CompletionStage<Result> getExam(Long id, Consumer<Exam> postProcessor, User user) {
    return findCollaborativeExam(id)
      .map(
        ce ->
          downloadExam(ce)
            .thenApplyAsync(
              result -> {
                if (result.isEmpty()) {
                  return notFound("sitnet_error_exam_not_found");
                }
                Exam exam = result.get();
                if (!isAuthorizedToView(exam, user)) {
                  return notFound("sitnet_error_exam_not_found");
                }
                postProcessor.accept(exam);
                return ok(serialize(exam));
              }
            )
      )
      .getOrElseGet(Function.identity());
  }

  @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
  public Result listGradeScales() {
    Set<GradeScale> grades = Ebean.find(GradeScale.class).fetch("grades").where().isNull("externalRef").findSet();
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
      .map(
        ce -> {
          if (!ce.getState().equals(Exam.State.DRAFT) && !ce.getState().equals(Exam.State.PRE_PUBLISHED)) {
            return wrapAsPromise(forbidden("sitnet_exam_removal_not_possible"));
          }
          return examLoader
            .deleteExam(ce)
            .thenApplyAsync(
              result -> {
                if (result.status() == Http.Status.OK) {
                  ce.delete();
                }
                return result;
              }
            );
        }
      )
      .getOrElseGet(Function.identity());
  }

  @Authenticated
  @With(ExamUpdateSanitizer.class)
  @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
  public CompletionStage<Result> updateExam(Long id, Http.Request request) {
    return findCollaborativeExam(id)
      .map(
        ce -> {
          User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
          return downloadExam(ce)
            .thenComposeAsync(
              result -> {
                if (result.isPresent()) {
                  Exam exam = result.get();
                  if (isAuthorizedToView(exam, user)) {
                    Exam.State previousState = exam.getState();
                    Optional<Result> error = Stream
                      .of(
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
                    return uploadExam(ce, exam, user)
                      .thenApplyAsync(
                        result2 -> {
                          if (result2.status() == 200 && isPrePublication) {
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
                        }
                      );
                  }
                  return wrapAsPromise(forbidden("sitnet_error_access_forbidden"));
                }
                return wrapAsPromise(notFound());
              }
            );
        }
      )
      .getOrElseGet(Function.identity());
  }

  @Authenticated
  @Restrict({ @Group("ADMIN") })
  public CompletionStage<Result> updateLanguage(Long id, String code, Http.Request request) {
    return findCollaborativeExam(id)
      .map(
        ce -> {
          User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
          return downloadExam(ce)
            .thenComposeAsync(
              result -> {
                if (result.isPresent()) {
                  Exam exam = result.get();
                  Optional<Result> error = examUpdater.updateLanguage(exam, code, user);
                  return error.isPresent() ? wrapAsPromise(error.get()) : uploadExam(ce, exam, user);
                }
                return wrapAsPromise(notFound());
              }
            );
        }
      )
      .getOrElseGet(Function.identity());
  }

  @Authenticated
  @With(EmailSanitizer.class)
  @Restrict({ @Group("ADMIN") })
  public CompletionStage<Result> addOwner(Long id, Http.Request request) {
    return findCollaborativeExam(id)
      .map(
        ce -> {
          User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
          return downloadExam(ce)
            .thenComposeAsync(
              result -> {
                if (result.isPresent()) {
                  Exam exam = result.get();
                  User owner = createOwner(request.attrs().get(Attrs.EMAIL));
                  exam.getExamOwners().add(owner);
                  return uploadExam(ce, exam, user, owner, null);
                }
                return wrapAsPromise(notFound());
              }
            );
        }
      )
      .getOrElseGet(Function.identity());
  }

  @Authenticated
  @Restrict({ @Group("ADMIN") })
  public CompletionStage<Result> removeOwner(Long id, Long oid, Http.Request request) {
    return findCollaborativeExam(id)
      .map(
        ce -> {
          User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
          return downloadExam(ce)
            .thenComposeAsync(
              result -> {
                if (result.isPresent()) {
                  Exam exam = result.get();
                  User owner = new User();
                  owner.setId(oid);
                  exam.getExamOwners().remove(owner);
                  return uploadExam(ce, exam, user);
                }
                return wrapAsPromise(notFound());
              }
            );
        }
      )
      .getOrElseGet(Function.identity());
  }

  private User createOwner(String email) {
    User user = new User();
    user.setId(newId());
    user.setEmail(email);
    return user;
  }
}
