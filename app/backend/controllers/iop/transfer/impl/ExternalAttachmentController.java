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

package backend.controllers.iop.transfer.impl;

import backend.controllers.base.BaseAttachmentController;
import backend.models.Attachment;
import backend.models.Exam;
import backend.models.ExamSectionQuestion;
import backend.models.User;
import backend.models.json.ExternalExam;
import backend.models.questions.EssayAnswer;
import backend.util.ConfigUtil;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import org.apache.commons.lang3.StringUtils;
import play.Logger;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.libs.ws.WSResponse;
import play.mvc.Http;
import play.mvc.Result;

import javax.inject.Inject;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletionStage;

public class ExternalAttachmentController extends BaseAttachmentController<String> {

    @Inject
    private WSClient wsClient;

    @Override
    public CompletionStage<Result> downloadExamAttachment(String hash) {
        Optional<ExternalExam> externalExam = getExternalExam(hash);
        if (!externalExam.isPresent()) {
            return wrapAsPromise(notFound());
        }
        try {
            final Exam exam = externalExam.get().deserialize();
            final Attachment attachment = exam.getAttachment();
            return serveExternalAttachment(attachment);
        } catch (IOException e) {
            Logger.error("Can not serialize exam!", e);
        }
        return wrapAsPromise(internalServerError());
    }

    @Override
    public CompletionStage<Result> addAttachmentToQuestionAnswer() {
        Http.MultipartFormData<File> body = request().body().asMultipartFormData();
        Http.MultipartFormData.FilePart<File> filePart = body.getFile("file");
        if (filePart == null) {
            return wrapAsPromise(notFound());
        }
        if (filePart.getFile().length() > ConfigUtil.getMaxFileSize()) {
            return wrapAsPromise(forbidden("sitnet_file_too_large"));
        }
        File file = filePart.getFile();
        Map<String, String[]> m = body.asFormUrlEncoded();
        final String hash = m.get("hash")[0];
        final Long qid = Long.parseLong(m.get("questionId")[0]);
        final Optional<ExternalExam> externalExam = getExternalExam(hash);

        if (!externalExam.isPresent()) {
            return wrapAsPromise(notFound());
        }

        Exam exam = deserializeExam(externalExam.get());
        if (exam == null) {
            return wrapAsPromise(internalServerError());
        }
        final ExamSectionQuestion sq = getExamSectionQuestion(qid, exam);
        if (questionAnswerNotFound(sq)) {
            return wrapAsPromise(notFound());
        }

        final EssayAnswer essayAnswer = sq.getEssayAnswer();

        String externalId = null;
        if (essayAnswer.getAttachment() != null) {
            externalId = essayAnswer.getAttachment().getExternalId();
        }

        final Optional<URL> url = parseUrl("/api/attachments/", externalId);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        final WSRequest request = wsClient.url(url.get().toString());
        if (StringUtils.isEmpty(externalId)) {
            return request.post(file).thenComposeAsync(wsResponse ->
                    sendEssayAnswerAttachment(externalExam.get(), exam, essayAnswer, wsResponse));
        }
        return request.put(file).thenComposeAsync(wsResponse ->
                sendEssayAnswerAttachment(externalExam.get(), exam, essayAnswer, wsResponse));
    }

    @Override
    public CompletionStage<Result> deleteQuestionAnswerAttachment(Long qid, String hash) {
        final Optional<ExternalExam> externalExam = getExternalExam(hash);
        if (!externalExam.isPresent()) {
            return wrapAsPromise(notFound());
        }
        final Exam exam = deserializeExam(externalExam.get());
        if (exam == null) {
            return wrapAsPromise(internalServerError());
        }
        final ExamSectionQuestion sectionQuestion = getExamSectionQuestion(qid, exam);
        if (questionAnswerNotFound(sectionQuestion)) {
            return wrapAsPromise(notFound());
        }
        final EssayAnswer essayAnswer = sectionQuestion.getEssayAnswer();
        if (sectionQuestion.getEssayAnswer().getAttachment() == null ||
                StringUtils.isEmpty(essayAnswer.getAttachment().getExternalId())) {
            return wrapAsPromise(notFound());
        }

        final Optional<URL> url = parseUrl("/api/attachments/", essayAnswer.getAttachment().getExternalId());
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        return wsClient.url(url.get().toString()).delete().thenCompose(wsResponse -> {
            essayAnswer.setAttachment(null);
            if (serializeExam(externalExam.get(), exam)) {
                return wrapAsPromise(new Result(wsResponse.getStatus()));
            }
            return wrapAsPromise(internalServerError());
        });
    }

    @Override
    public CompletionStage<Result> downloadQuestionAnswerAttachment(Long qid, String hash) {
        final Optional<ExternalExam> externalExam = getExternalExam(hash);
        if (!externalExam.isPresent()) {
            return wrapAsPromise(notFound());
        }
        final Exam exam = deserializeExam(externalExam.get());
        if (exam == null) {
            return wrapAsPromise(internalServerError());
        }
        final ExamSectionQuestion sectionQuestion = getExamSectionQuestion(qid, exam);
        if (questionAnswerNotFound(sectionQuestion)) {
            return wrapAsPromise(notFound());
        }
        final EssayAnswer essayAnswer = sectionQuestion.getEssayAnswer();
        if (sectionQuestion.getEssayAnswer().getAttachment() == null ||
                StringUtils.isEmpty(essayAnswer.getAttachment().getExternalId())) {
            return wrapAsPromise(notFound());
        }
        return serveExternalAttachment(essayAnswer.getAttachment());
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public CompletionStage<Result> downloadQuestionAttachment(String eid, Long qid) {
        Optional<ExternalExam> externalExam = getExternalExam(eid);
        if (!externalExam.isPresent()) {
            return wrapAsPromise(notFound());
        }
        final Exam exam = deserializeExam(externalExam.get());
        if (exam == null) {
            return wrapAsPromise(internalServerError());
        }
        final ExamSectionQuestion sectionQuestion = getExamSectionQuestion(qid, exam);
        if (sectionQuestion == null) {
            return wrapAsPromise(notFound());
        }
        final Attachment attachment = sectionQuestion.getQuestion().getAttachment();
        return serveExternalAttachment(attachment);
    }

    private boolean questionAnswerNotFound(ExamSectionQuestion sectionQuestion) {
        return sectionQuestion == null
                || sectionQuestion.getEssayAnswer() == null;
    }

    private CompletionStage<Result> sendEssayAnswerAttachment(ExternalExam externalExam, Exam exam,
                                                              EssayAnswer essayAnswer, WSResponse wsResponse) {
        if (wsResponse.getStatus() != 200 && wsResponse.getStatus() != 201) {
            Logger.error("Could not create external exam to XM server!");
            return wrapAsPromise(new Result(wsResponse.getStatus()));
        }
        final JsonNode json = wsResponse.asJson();
        final String id = json.get("id").asText();
        final Attachment a = new Attachment();
        a.setExternalId(id);
        a.setMimeType(json.get("mimeType").asText());
        a.setFileName(json.get("displayName").asText());
        essayAnswer.setAttachment(a);
        if (serializeExam(externalExam, exam)) {
            return wrapAsPromise(created(a));
        }
        return wrapAsPromise(internalServerError());
    }

    private boolean serializeExam(ExternalExam externalExam, Exam exam) {
        try {
            externalExam.serialize(exam);
            externalExam.save();
            return true;
        } catch (IOException e) {
            Logger.error("Can not serialize exam!", e);
        }
        return false;
    }

    private Exam deserializeExam(ExternalExam externalExam) {
        try {
            return externalExam.deserialize();
        } catch (IOException e) {
            Logger.error("Can not deserialize external exam!", e);
        }
        return null;
    }

    private ExamSectionQuestion getExamSectionQuestion(Long qid, Exam exam) {
        return exam.getExamSections().stream()
                .flatMap(es -> es.getSectionQuestions().stream())
                .filter(q -> q.getId().equals(qid))
                .findFirst().orElse(null);
    }

    private Optional<ExternalExam> getExternalExam(String id) {
        final User user = getLoggedUser();
        final ExpressionList<ExternalExam> query = Ebean.find(ExternalExam.class).where()
                .eq("hash", id);
        if (user.hasRole("STUDENT", getSession())) {
            query.eq("creator", user);
        }
        return query.findOneOrEmpty();
    }

    private CompletionStage<Result> serveExternalAttachment(Attachment attachment) {
        final String externalId = attachment.getExternalId();
        if (StringUtils.isEmpty(externalId)) {
            Logger.warn("External id can not be found for attachment [id={}]", attachment.getId());
            return wrapAsPromise(notFound());
        }
        final Optional<URL> url = parseUrl("/api/attachments/%s/download", externalId);
        if (!url.isPresent()) {
            return wrapAsPromise(internalServerError());
        }
        return wsClient.url(url.get().toString()).stream().thenApply(WSResponse::getBodyAsSource)
                .thenCompose(byteStringSource -> serveAsBase64Stream(attachment, byteStringSource));
    }

    private static Optional<URL> parseUrl(String url, String id) {
        String urlString = ConfigFactory.load().getString("sitnet.integration.iop.host") + url;
        if (!StringUtils.isEmpty(id)) {
            urlString = String.format(urlString, id);
        }
        try {
            return Optional.of(new URL(urlString));
        } catch (MalformedURLException e) {
            Logger.error("Malformed URL {}", e);
            return Optional.empty();
        }
    }
}
