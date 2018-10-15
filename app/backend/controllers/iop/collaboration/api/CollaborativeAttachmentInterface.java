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

import java.io.File;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

import akka.NotUsed;
import akka.stream.IOResult;
import akka.stream.javadsl.FileIO;
import akka.stream.javadsl.Source;
import akka.util.ByteString;

import backend.controllers.BaseAttachmentInterface;
import backend.models.Attachment;
import backend.models.Comment;
import backend.models.Exam;
import backend.models.ExamSectionQuestion;
import backend.models.User;
import backend.models.api.AttachmentContainer;
import backend.models.questions.EssayAnswer;
import backend.util.AppUtil;
import backend.util.config.ConfigUtil;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import org.apache.commons.lang3.StringUtils;
import play.Logger;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import static play.mvc.Controller.request;
import static play.mvc.Http.Status.NOT_FOUND;
import static play.mvc.Http.Status.OK;

public interface CollaborativeAttachmentInterface<T, U> extends BaseAttachmentInterface<T> {

    @Override
    default CompletionStage<Result> deleteExamAttachment(T id) {
        final Optional<U> externalExam = getExternalExam(id);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        return deleteExternalAttachment(exam.get(), externalExam.get(),
                exam.get(), getLoggedUser());
    }

    @Override
    default CompletionStage<Result> addAttachmentToExam() {
        Http.MultipartFormData<File> body = request().body().asMultipartFormData();
        Http.MultipartFormData.FilePart<File> filePart = body.getFile("file");

        if (filePart == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        if (filePart.getFile().length() > ConfigUtil.getMaxFileSize()) {
            return CompletableFuture.supplyAsync(() -> Results.forbidden("sitnet_file_too_large"));
        }

        Map<String, String[]> m = body.asFormUrlEncoded();
        final String id = m.get("examId")[0];
        final Optional<U> externalExam = getExternalExam(parseId(id));
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }

        Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        return uploadAttachment(filePart, externalExam.get(), exam.get(), exam.get());
    }

    @Override
    default CompletionStage<Result> downloadExamAttachment(T id) {
        Optional<U> externalExam = getExternalExam(id);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        final Attachment attachment = exam.get().getAttachment();
        return downloadExternalAttachment(attachment);
    }

    @Override
    default CompletionStage<Result> addAttachmentToQuestion() {
        Http.MultipartFormData<File> body = request().body().asMultipartFormData();
        Http.MultipartFormData.FilePart<File> filePart = body.getFile("file");

        if (filePart == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        if (filePart.getFile().length() > ConfigUtil.getMaxFileSize()) {
            return CompletableFuture.supplyAsync(() -> Results.forbidden("sitnet_file_too_large"));
        }

        Map<String, String[]> m = body.asFormUrlEncoded();
        final String id = m.get("examId")[0];
        final Optional<U> externalExam = getExternalExam(parseId(id));
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }

        Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }

        final Long qid = Long.parseLong(m.get("questionId")[0]);
        final ExamSectionQuestion sq = getExamSectionQuestion(qid, exam.get());
        if (sq == null || sq.getQuestion() == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }

        return uploadAttachment(filePart, externalExam.get(), exam.get(), sq.getQuestion());
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    default CompletionStage<Result> downloadQuestionAttachment(T eid, Long qid) {
        Optional<U> externalExam = getExternalExam(eid);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        final ExamSectionQuestion sectionQuestion = getExamSectionQuestion(qid, exam.get());
        if (sectionQuestion == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final Attachment attachment = sectionQuestion.getQuestion().getAttachment();
        return downloadExternalAttachment(attachment);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    default CompletionStage<Result> deleteQuestionAttachment(T eid, Long qid) {
        Optional<U> externalExam = getExternalExam(eid);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        final ExamSectionQuestion sectionQuestion = getExamSectionQuestion(qid, exam.get());
        if (sectionQuestion == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        return deleteExternalAttachment(sectionQuestion.getQuestion(), externalExam.get(),
                exam.get(), getLoggedUser());
    }

    @Override
    default CompletionStage<Result> addAttachmentToQuestionAnswer() {
        Http.MultipartFormData<File> body = request().body().asMultipartFormData();
        Http.MultipartFormData.FilePart<File> filePart = body.getFile("file");

        if (filePart == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        if (filePart.getFile().length() > ConfigUtil.getMaxFileSize()) {
            return CompletableFuture.supplyAsync(() -> Results.forbidden("sitnet_file_too_large"));
        }

        Map<String, String[]> m = body.asFormUrlEncoded();
        final String id = m.get("examId")[0];
        final Optional<U> externalExam = getExternalExam(parseId(id));
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }

        Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }

        final Long qid = Long.parseLong(m.get("questionId")[0]);
        final ExamSectionQuestion sq = getExamSectionQuestion(qid, exam.get());
        if (questionAnswerNotFound(sq)) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }

        return uploadAttachment(filePart, externalExam.get(), exam.get(), sq.getEssayAnswer());
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    default CompletionStage<Result> deleteQuestionAnswerAttachment(Long qid, T eid) {
        final Optional<U> externalExam = getExternalExam(eid);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        final ExamSectionQuestion sectionQuestion = getExamSectionQuestion(qid, exam.get());
        if (questionAnswerNotFound(sectionQuestion)) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final EssayAnswer essayAnswer = sectionQuestion.getEssayAnswer();
        if (sectionQuestion.getEssayAnswer().getAttachment() == null ||
                StringUtils.isEmpty(essayAnswer.getAttachment().getExternalId())) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }

        final Optional<URL> url = parseUrl("/api/attachments/", essayAnswer.getAttachment().getExternalId());
        if (!url.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        return deleteExternalAttachment(essayAnswer, externalExam.get(), exam.get(), getLoggedUser());
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    default CompletionStage<Result> downloadQuestionAnswerAttachment(Long qid, T eid) {
        final Optional<U> externalExam = getExternalExam(eid);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        final ExamSectionQuestion sectionQuestion = getExamSectionQuestion(qid, exam.get());
        if (questionAnswerNotFound(sectionQuestion)) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final EssayAnswer essayAnswer = sectionQuestion.getEssayAnswer();
        if (essayAnswer == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        return downloadExternalAttachment(essayAnswer.getAttachment());
    }

    @Override
    default CompletionStage<Result> addFeedbackAttachment(T id) {
        Http.MultipartFormData<File> body = request().body().asMultipartFormData();
        Http.MultipartFormData.FilePart<File> filePart = body.getFile("file");

        if (filePart == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        if (filePart.getFile().length() > ConfigUtil.getMaxFileSize()) {
            return CompletableFuture.supplyAsync(() -> Results.forbidden("sitnet_file_too_large"));
        }

        final Optional<U> externalExam = getExternalExam(id);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }

        Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        Exam e = exam.get();
        if (e.getExamFeedback() == null) {
            final Comment comment = new Comment();
            AppUtil.setCreator(comment, getLoggedUser());
            e.setExamFeedback(comment);
        }
        return uploadAttachment(filePart, externalExam.get(), e, e.getExamFeedback());
    }

    @Override
    default CompletionStage<Result> downloadFeedbackAttachment(T id) {
        final Optional<U> externalExam = getExternalExam(id);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        Exam e = exam.get();
        if (e.getExamFeedback() == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        return downloadExternalAttachment(e.getExamFeedback().getAttachment());
    }

    @Override
    default CompletionStage<Result> deleteFeedbackAttachment(T id) {
        final Optional<U> externalExam = getExternalExam(id);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        Exam e = exam.get();
        if (e.getExamFeedback() == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        return deleteExternalAttachment(e.getExamFeedback(), externalExam.get(),
                exam.get(), getLoggedUser());
    }

    @Override
    default CompletionStage<Result> addStatementAttachment(T id) {
        Http.MultipartFormData<File> body = request().body().asMultipartFormData();
        Http.MultipartFormData.FilePart<File> filePart = body.getFile("file");

        if (filePart == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        if (filePart.getFile().length() > ConfigUtil.getMaxFileSize()) {
            return CompletableFuture.supplyAsync(() -> Results.forbidden("sitnet_file_too_large"));
        }

        final Optional<U> externalExam = getExternalExam(id);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }

        Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        Exam e = exam.get();

        if (e.getLanguageInspection() == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        if (e.getLanguageInspection().getStatement() == null) {
            final Comment comment = new Comment();
            AppUtil.setCreator(comment, getLoggedUser());
            e.getLanguageInspection().setStatement(comment);
        }
        return uploadAttachment(filePart, externalExam.get(), e, e.getLanguageInspection().getStatement());
    }

    @Override
    default CompletionStage<Result> downloadStatementAttachment(T id) {
        final Optional<U> externalExam = getExternalExam(id);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        Exam e = exam.get();
        if (e.getLanguageInspection() == null || e.getLanguageInspection().getStatement() == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        return downloadExternalAttachment(e.getLanguageInspection().getStatement().getAttachment());
    }

    @Override
    default CompletionStage<Result> deleteStatementAttachment(T id) {
        final Optional<U> externalExam = getExternalExam(id);
        if (!externalExam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final Optional<Exam> exam = getExam(externalExam.get());
        if (!exam.isPresent()) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        Exam e = exam.get();
        if (e.getLanguageInspection() == null || e.getLanguageInspection().getStatement() == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        return deleteExternalAttachment(e.getLanguageInspection().getStatement(),
                externalExam.get(), exam.get(), getLoggedUser());
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    default CompletionStage<Result> downloadExternalAttachment(String id) {
        final Optional<URL> url = parseUrl("/api/attachments/%s", id);
        if (!url.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        return getWsClient().url(url.get().toString()).get().thenCompose(response -> {
            if (response.getStatus() != 200) {
                return CompletableFuture.supplyAsync(() -> Results.status(response.getStatus()));
            }
            final JsonNode node = response.asJson();
            return download(id, node.path("mimeType").asText(), node.path("displayName").asText());
        });
    }

    default CompletionStage<Result> downloadExternalAttachment(Attachment attachment) {
        if (attachment == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final String externalId = attachment.getExternalId();
        if (StringUtils.isEmpty(externalId)) {
            Logger.warn("External id can not be found for attachment [id={}]", attachment.getId());
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        return download(externalId, attachment.getMimeType(), attachment.getFileName());
    }

    default CompletionStage<Result> download(String id, String mimeType, String fileName) {
        final Optional<URL> url = parseUrl("/api/attachments/%s/download", id);
        if (!url.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        return getWsClient().url(url.get().toString()).stream().thenCompose(response -> {
            if (response.getStatus() != 200) {
                return CompletableFuture.supplyAsync(() -> Results.status(response.getStatus()));
            }
            return serveAsBase64Stream(mimeType, fileName, response.getBodyAsSource());
        });
    }

    default CompletionStage<Result> deleteExternalAttachment(AttachmentContainer attachmentContainer, U externalExam,
                                                             Exam exam, User user) {
        Attachment attachment = attachmentContainer.getAttachment();
        if (attachment == null) {
            return CompletableFuture.supplyAsync(Results::notFound);
        }
        final String externalId = attachment.getExternalId();
        if (StringUtils.isEmpty(externalId)) {
            Logger.warn("External id can not be found for attachment [id={}]", attachment.getExternalId());
            return CompletableFuture.supplyAsync(Results::notFound);
        }

        final Optional<URL> url = parseUrl("/api/attachments/%s", externalId);
        if (!url.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        return getWsClient().url(url.get().toString()).delete()
                .thenApply(wsResponse -> new Result(wsResponse.getStatus()))
                .thenComposeAsync(result -> {
                    if (result.status() != OK && result.status() != NOT_FOUND) {
                        return CompletableFuture.supplyAsync(() -> result);
                    }

                    attachmentContainer.setAttachment(null);
                    if (setExam(externalExam, exam, user)) {
                        return CompletableFuture.supplyAsync(Results::ok);
                    }
                    return CompletableFuture.supplyAsync(Results::internalServerError);
                });
    }

    default Optional<URL> parseUrl(String url, String id) {
        String urlString = ConfigFactory.load().getString("sitnet.integration.iop.host") + url;
        id = id == null ? "" : id;
        urlString = String.format(urlString, id);
        try {
            return Optional.of(new URL(urlString));
        } catch (MalformedURLException e) {
            Logger.error("Malformed URL {}", e);
            return Optional.empty();
        }
    }

    default CompletionStage<Result> uploadAttachment(Http.MultipartFormData.FilePart<File> file, U externalExam,
                                                     Exam exam, AttachmentContainer container) {
        String externalId = null;
        if (container.getAttachment() != null) {
            externalId = container.getAttachment().getExternalId();
        }

        final Optional<URL> url = parseUrl("/api/attachments/%s", externalId);
        if (!url.isPresent()) {
            return CompletableFuture.supplyAsync(Results::internalServerError);
        }
        final WSRequest request = getWsClient().url(url.get().toString());
        final Source<ByteString, CompletionStage<IOResult>> source = FileIO.fromPath(file.getFile().toPath());
        final Http.MultipartFormData.FilePart<Source<ByteString, CompletionStage<IOResult>>> filePart =
                new Http.MultipartFormData.FilePart<>("file",
                        file.getFilename(),
                        file.getContentType(), source);
        final Source<Http.MultipartFormData.Part<? extends Source<ByteString, ?>>, NotUsed> body =
                Source.from(Collections.singletonList(filePart));
        final User loggedUser = getLoggedUser();
        if (StringUtils.isEmpty(externalId)) {
            return request.post(body).thenComposeAsync(wsResponse ->
                    createExternalAttachment(externalExam, exam, container, wsResponse, loggedUser));
        }
        return request.put(body).thenComposeAsync(wsResponse ->
                createExternalAttachment(externalExam, exam, container, wsResponse, loggedUser));
    }

    default CompletionStage<Result> createExternalAttachment(U externalExam, Exam exam,
                                                             AttachmentContainer container, WSResponse wsResponse,
                                                             User user) {
        if (wsResponse.getStatus() != 200 && wsResponse.getStatus() != 201) {
            Logger.error("Could not create external attachment to XM server!");
            return CompletableFuture.supplyAsync(() -> new Result(wsResponse.getStatus()));
        }
        final JsonNode json = wsResponse.asJson();
        final String id = json.get("id").asText();
        final Attachment a = new Attachment();
        a.setExternalId(id);
        a.setMimeType(json.get("mimeType").asText());
        a.setFileName(json.get("displayName").asText());
        container.setAttachment(a);
        if (setExam(externalExam, exam, user)) {
            return CompletableFuture.supplyAsync(() -> {
                final String body = Ebean.json().toJson(a);
                return Results.created(body).as("application/json");
            });
        }
        return CompletableFuture.supplyAsync(Results::internalServerError);
    }

    default boolean questionAnswerNotFound(ExamSectionQuestion sectionQuestion) {
        return sectionQuestion == null
                || sectionQuestion.getEssayAnswer() == null;
    }

    Optional<Exam> getExam(U externalExam);

    Optional<U> getExternalExam(T eid);

    WSClient getWsClient();

    boolean setExam(U externalExam, Exam exam, User user);

    T parseId(String id);

    User getLoggedUser();
}
