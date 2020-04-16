/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */

package backend.controllers.iop.collaboration.api;

import static play.mvc.Http.Status.NOT_FOUND;
import static play.mvc.Http.Status.OK;

import akka.stream.IOResult;
import akka.stream.javadsl.FileIO;
import akka.stream.javadsl.Source;
import akka.util.ByteString;
import backend.controllers.BaseAttachmentInterface;
import backend.models.Attachment;
import backend.models.Comment;
import backend.models.Exam;
import backend.models.LanguageInspection;
import backend.models.User;
import backend.models.api.AttachmentContainer;
import backend.models.questions.EssayAnswer;
import backend.models.sections.ExamSectionQuestion;
import backend.security.Authenticated;
import backend.util.AppUtil;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Pattern;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.vavr.control.Either;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Function;
import org.apache.commons.lang3.StringUtils;
import play.libs.Files;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

public interface CollaborativeAttachmentInterface<T, U> extends BaseAttachmentInterface<T> {
    default Either<CompletionStage<Result>, U> findExternalExam(T id, Http.Request request) {
        return getExternalExam(id, request)
            .<Either<CompletionStage<Result>, U>>map(Either::right)
            .orElse(Either.left(CompletableFuture.completedFuture(Results.notFound())));
    }

    default Either<CompletionStage<Result>, Exam> findExam(U ee) {
        return getExam(ee)
            .<Either<CompletionStage<Result>, Exam>>map(Either::right)
            .orElse(Either.left(CompletableFuture.completedFuture(Results.notFound())));
    }

    default Either<CompletionStage<Result>, ExamSectionQuestion> findSectionQuestion(Long id, Exam exam) {
        return getExamSectionQuestion(id, exam)
            .<Either<CompletionStage<Result>, ExamSectionQuestion>>map(Either::right)
            .orElse(Either.left(CompletableFuture.completedFuture(Results.notFound())));
    }

    default Either<CompletionStage<Result>, EssayAnswer> findEssayAnswerWithAttachment(ExamSectionQuestion esq) {
        return (
                esq.getEssayAnswer() == null ||
                esq.getEssayAnswer().getAttachment() == null ||
                StringUtils.isEmpty(esq.getEssayAnswer().getAttachment().getExternalId())
            )
            ? Either.left(CompletableFuture.completedFuture(Results.notFound()))
            : Either.right(esq.getEssayAnswer());
    }

    default Either<CompletionStage<Result>, LanguageInspection> findLanguageInspection(Exam exam) {
        return exam.getLanguageInspection() == null
            ? Either.left(CompletableFuture.completedFuture(Results.notFound()))
            : Either.right(exam.getLanguageInspection());
    }

    default Either<CompletionStage<Result>, LanguageInspection> findLanguageInspectionWithAttachment(Exam e) {
        return (e.getLanguageInspection() == null || e.getLanguageInspection().getStatement() == null)
            ? Either.left(CompletableFuture.completedFuture(Results.notFound()))
            : Either.right(e.getLanguageInspection());
    }

    default Source<Http.MultipartFormData.Part<? extends Source<ByteString, ?>>, ?> createSource(
        Http.MultipartFormData.FilePart<Files.TemporaryFile> file
    ) {
        Source<ByteString, CompletionStage<IOResult>> source = FileIO.fromPath(file.getRef().path());
        Http.MultipartFormData.FilePart<Source<ByteString, CompletionStage<IOResult>>> filePart = new Http.MultipartFormData.FilePart<>(
            "file",
            file.getFilename(),
            file.getContentType(),
            source
        );
        return Source.from(Set.of(filePart));
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Override
    default CompletionStage<Result> deleteExamAttachment(T id, Http.Request request) {
        return findExternalExam(id, request)
            .map(
                ee ->
                    findExam(ee)
                        .map(e -> deleteExternalAttachment(e, ee, e, getUser(request)))
                        .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Override
    default CompletionStage<Result> addAttachmentToExam(Http.Request request) {
        MultipartForm mf = getForm(request);
        Http.MultipartFormData.FilePart<Files.TemporaryFile> filePart = mf.getFilePart();
        final String id = mf.getForm().get("examId")[0];
        return findExternalExam(parseId(id), request)
            .map(
                ee ->
                    findExam(ee)
                        .map(e -> uploadAttachment(filePart, ee, e, e, getUser(request)))
                        .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    @Override
    default CompletionStage<Result> downloadExamAttachment(T id, Http.Request request) {
        return findExternalExam(id, request)
            .flatMap(this::findExam)
            .map(e -> downloadExternalAttachment(e.getAttachment()))
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Override
    default CompletionStage<Result> addAttachmentToQuestion(Http.Request request) {
        MultipartForm mf = getForm(request);
        Http.MultipartFormData.FilePart<Files.TemporaryFile> filePart = mf.getFilePart();
        final String id = mf.getForm().get("examId")[0];
        final Long qid = Long.parseLong(mf.getForm().get("questionId")[0]);
        return findExternalExam(parseId(id), request)
            .map(
                ee ->
                    findExam(ee)
                        .map(
                            e ->
                                findSectionQuestion(qid, e)
                                    .map(sq -> uploadAttachment(filePart, ee, e, sq.getQuestion(), getUser(request)))
                                    .getOrElseGet(Function.identity())
                        )
                        .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    default CompletionStage<Result> downloadQuestionAttachment(T eid, Long qid, Http.Request request) {
        return findExternalExam(eid, request)
            .flatMap(this::findExam)
            .flatMap(e -> findSectionQuestion(qid, e))
            .map(sq -> downloadExternalAttachment(sq.getQuestion().getAttachment()))
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    default CompletionStage<Result> deleteQuestionAttachment(T eid, Long qid, Http.Request request) {
        return findExternalExam(eid, request)
            .map(
                ee ->
                    findExam(ee)
                        .map(
                            e ->
                                findSectionQuestion(qid, e)
                                    .map(sq -> deleteExternalAttachment(sq.getQuestion(), ee, e, getUser(request)))
                                    .getOrElseGet(Function.identity())
                        )
                        .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @Override
    default CompletionStage<Result> addAttachmentToQuestionAnswer(Http.Request request) {
        MultipartForm mf = getForm(request);
        Http.MultipartFormData.FilePart<Files.TemporaryFile> filePart = mf.getFilePart();
        final String id = mf.getForm().get("examId")[0];
        final Long qid = Long.parseLong(mf.getForm().get("questionId")[0]);
        return findExternalExam(parseId(id), request)
            .map(
                ee ->
                    findExam(ee)
                        .map(
                            e ->
                                findSectionQuestion(qid, e)
                                    .map(
                                        sq -> {
                                            if (sq.getEssayAnswer() == null) {
                                                sq.setEssayAnswer(new EssayAnswer());
                                            }
                                            return uploadAttachment(
                                                filePart,
                                                ee,
                                                e,
                                                sq.getEssayAnswer(),
                                                getUser(request)
                                            );
                                        }
                                    )
                                    .getOrElseGet(Function.identity())
                        )
                        .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    default CompletionStage<Result> deleteQuestionAnswerAttachment(Long qid, T eid, Http.Request request) {
        return findExternalExam(eid, request)
            .map(
                ee ->
                    findExam(ee)
                        .map(
                            e ->
                                findSectionQuestion(qid, e)
                                    .map(
                                        sq ->
                                            findEssayAnswerWithAttachment(sq)
                                                .map(ea -> deleteExternalAttachment(ea, ee, e, getUser(request)))
                                                .getOrElseGet(Function.identity())
                                    )
                                    .getOrElseGet(Function.identity())
                        )
                        .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    default CompletionStage<Result> downloadQuestionAnswerAttachment(Long qid, T eid, Http.Request request) {
        return findExternalExam(eid, request)
            .flatMap(this::findExam)
            .flatMap(e -> findSectionQuestion(qid, e))
            .flatMap(this::findEssayAnswerWithAttachment)
            .map(ea -> downloadExternalAttachment(ea.getAttachment()))
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    default CompletionStage<Result> addAssessmentAttachment(T id, String ref, Http.Request request) {
        return findExternalExam(id, request)
            .map(ee -> updateExternalAssessment(ee, ref, request))
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    default CompletionStage<Result> deleteAssessmentAttachment(T id, String ref, Http.Request request) {
        return findExternalExam(id, request)
            .map(ee -> deleteExternalAssessment(ee, ref))
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    @Override
    default CompletionStage<Result> addStatementAttachment(T id, Http.Request request) {
        MultipartForm mf = getForm(request);
        Http.MultipartFormData.FilePart<Files.TemporaryFile> filePart = mf.getFilePart();
        User user = getUser(request);

        return findExternalExam(id, request)
            .map(
                ee ->
                    findExam(ee)
                        .map(
                            e ->
                                findLanguageInspection(e)
                                    .map(
                                        li -> {
                                            if (li.getStatement() == null) {
                                                final Comment comment = new Comment();
                                                AppUtil.setCreator(comment, user);
                                                li.setStatement(comment);
                                            }
                                            return uploadAttachment(filePart, ee, e, li.getStatement(), user);
                                        }
                                    )
                                    .getOrElseGet(Function.identity())
                        )
                        .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    @Override
    default CompletionStage<Result> downloadStatementAttachment(T id, Http.Request request) {
        return findExternalExam(id, request)
            .map(
                ee ->
                    findExam(ee)
                        .map(
                            e ->
                                findLanguageInspectionWithAttachment(e)
                                    .map(li -> downloadExternalAttachment(li.getStatement().getAttachment()))
                                    .getOrElseGet(Function.identity())
                        )
                        .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Authenticated
    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    @Override
    default CompletionStage<Result> deleteStatementAttachment(T id, Http.Request request) {
        return findExternalExam(id, request)
            .map(
                ee ->
                    findExam(ee)
                        .map(
                            e ->
                                findLanguageInspectionWithAttachment(e)
                                    .map(li -> deleteExternalAttachment(li.getStatement(), ee, e, getUser(request)))
                                    .getOrElseGet(Function.identity())
                        )
                        .getOrElseGet(Function.identity())
            )
            .getOrElseGet(Function.identity());
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT") })
    default CompletionStage<Result> downloadExternalAttachment(String id) {
        final Optional<URL> url = parseUrl("/api/attachments/%s", id);
        if (url.isEmpty()) {
            return CompletableFuture.completedFuture(Results.internalServerError());
        }
        return getWsClient()
            .url(url.get().toString())
            .get()
            .thenCompose(
                response -> {
                    if (response.getStatus() != Http.Status.OK) {
                        return CompletableFuture.completedFuture(Results.status(response.getStatus()));
                    }
                    final JsonNode node = response.asJson();
                    return download(id, node.path("mimeType").asText(), node.path("displayName").asText());
                }
            );
    }

    default CompletionStage<Result> downloadExternalAttachment(Attachment attachment) {
        if (attachment == null) {
            return CompletableFuture.completedFuture(Results.notFound());
        }
        final String externalId = attachment.getExternalId();
        if (StringUtils.isEmpty(externalId)) {
            logger().warn("External id can not be found for attachment [id={}]", attachment.getId());
            return CompletableFuture.completedFuture(Results.notFound());
        }
        return download(externalId, attachment.getMimeType(), attachment.getFileName());
    }

    default CompletionStage<Result> download(String id, String mimeType, String fileName) {
        final Optional<URL> url = parseUrl("/api/attachments/%s/download", id);
        if (url.isEmpty()) {
            return CompletableFuture.completedFuture(Results.internalServerError());
        }
        return getWsClient()
            .url(url.get().toString())
            .stream()
            .thenCompose(
                response -> {
                    if (response.getStatus() != Http.Status.OK) {
                        return CompletableFuture.completedFuture(Results.status(response.getStatus()));
                    }
                    try {
                        return serveAsBase64Stream(mimeType, fileName, response.getBodyAsSource());
                    } catch (IOException e) {
                        throw new RuntimeException(e);
                    }
                }
            );
    }

    default CompletionStage<Result> deleteExternalAttachment(
        AttachmentContainer attachmentContainer,
        U externalExam,
        Exam exam,
        User user
    ) {
        Attachment attachment = attachmentContainer.getAttachment();
        if (attachment == null) {
            return CompletableFuture.completedFuture(Results.notFound());
        }
        final String externalId = attachment.getExternalId();
        if (StringUtils.isEmpty(externalId)) {
            logger().warn("External id can not be found for attachment [id={}]", attachment.getExternalId());
            return CompletableFuture.completedFuture(Results.notFound());
        }

        final Optional<URL> url = parseUrl("/api/attachments/%s", externalId);
        if (url.isEmpty()) {
            return CompletableFuture.completedFuture(Results.internalServerError());
        }
        return getWsClient()
            .url(url.get().toString())
            .delete()
            .thenApply(wsResponse -> new Result(wsResponse.getStatus()))
            .thenComposeAsync(
                result -> {
                    if (result.status() != OK && result.status() != NOT_FOUND) {
                        return CompletableFuture.completedFuture(result);
                    }

                    attachmentContainer.setAttachment(null);
                    if (setExam(externalExam, exam, user)) {
                        return CompletableFuture.completedFuture(Results.ok());
                    }
                    return CompletableFuture.completedFuture(Results.internalServerError());
                }
            );
    }

    default Optional<URL> parseUrl(String url, String id) {
        String urlString = ConfigFactory.load().getString("sitnet.integration.iop.host") + url;
        String id2 = id == null ? "" : id;
        urlString = String.format(urlString, id2);
        try {
            return Optional.of(new URL(urlString));
        } catch (MalformedURLException e) {
            logger().error("Malformed URL {}", e);
            return Optional.empty();
        }
    }

    default CompletionStage<Result> uploadAttachment(
        Http.MultipartFormData.FilePart<Files.TemporaryFile> file,
        U externalExam,
        Exam exam,
        AttachmentContainer container,
        User user
    ) {
        String externalId = null;
        if (container.getAttachment() != null) {
            externalId = container.getAttachment().getExternalId();
        }

        final Optional<URL> url = parseUrl("/api/attachments/%s", externalId);
        if (url.isEmpty()) {
            return CompletableFuture.completedFuture(Results.internalServerError());
        }
        final WSRequest request = getWsClient().url(url.get().toString());
        Source<Http.MultipartFormData.Part<? extends Source<ByteString, ?>>, ?> source = createSource(file);
        if (StringUtils.isEmpty(externalId)) {
            return request
                .post(source)
                .thenComposeAsync(
                    wsResponse -> createExternalAttachment(externalExam, exam, container, wsResponse, user)
                );
        }
        return request
            .put(source)
            .thenComposeAsync(wsResponse -> createExternalAttachment(externalExam, exam, container, wsResponse, user));
    }

    default CompletionStage<Result> createExternalAttachment(
        U externalExam,
        Exam exam,
        AttachmentContainer container,
        WSResponse wsResponse,
        User user
    ) {
        if (wsResponse.getStatus() != Http.Status.OK && wsResponse.getStatus() != Http.Status.CREATED) {
            logger().error("Could not create external attachment to XM server!");
            return CompletableFuture.completedFuture(new Result(wsResponse.getStatus()));
        }
        final JsonNode json = wsResponse.asJson();
        final String id = json.get("id").asText();
        final Attachment a = new Attachment();
        a.setExternalId(id);
        a.setMimeType(json.get("mimeType").asText());
        a.setFileName(json.get("displayName").asText());
        container.setAttachment(a);
        if (setExam(externalExam, exam, user)) {
            final String body = Ebean.json().toJson(a);
            return CompletableFuture.completedFuture(Results.created(body).as("application/json"));
        }
        return CompletableFuture.completedFuture(Results.internalServerError());
    }

    Optional<Exam> getExam(U externalExam);

    Optional<U> getExternalExam(T eid, Http.Request request);

    CompletionStage<Result> updateExternalAssessment(U exam, String assessmentRef, Http.Request request);

    CompletionStage<Result> deleteExternalAssessment(U exam, String assessmentRef);

    WSClient getWsClient();

    boolean setExam(U externalExam, Exam exam, User user);

    T parseId(String id);
}
