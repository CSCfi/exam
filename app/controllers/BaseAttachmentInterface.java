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

package controllers;

import static play.mvc.Results.ok;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import models.Attachment;
import models.Exam;
import models.User;
import models.sections.ExamSectionQuestion;
import org.apache.commons.io.FileUtils;
import org.apache.pekko.stream.javadsl.Source;
import org.apache.pekko.util.ByteString;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.libs.Files.TemporaryFile;
import play.mvc.Http;
import play.mvc.Result;
import sanitizers.Attrs;
import util.config.ConfigReader;
import util.file.ChunkMaker;

public interface BaseAttachmentInterface<T> {
    CompletionStage<Result> downloadExamAttachment(T id, Http.Request request);

    CompletionStage<Result> addAttachmentToQuestion(Http.Request request);

    CompletionStage<Result> addAttachmentToExam(Http.Request request);

    CompletionStage<Result> addAttachmentToQuestionAnswer(Http.Request request);

    CompletionStage<Result> deleteExamAttachment(T id, Http.Request request);

    CompletionStage<Result> addFeedbackAttachment(T id, Http.Request request);

    CompletionStage<Result> downloadFeedbackAttachment(T id, Http.Request request);

    CompletionStage<Result> addStatementAttachment(T id, Http.Request request);

    CompletionStage<Result> downloadStatementAttachment(T id, Http.Request request);

    CompletionStage<Result> deleteFeedbackAttachment(T id, Http.Request request);

    CompletionStage<Result> deleteStatementAttachment(T id, Http.Request request);

    ConfigReader getConfigReader();

    default User getUser(Http.Request request) {
        return request.attrs().get(Attrs.AUTHENTICATED_USER);
    }

    default Logger logger() {
        return LoggerFactory.getLogger(getClass());
    }

    default CompletionStage<Result> serveAsBase64Stream(Attachment attachment, Source<ByteString, ?> source) {
        try {
            return serveAsBase64Stream(attachment.getMimeType(), attachment.getFileName(), source);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    default CompletionStage<Result> serveAsBase64Stream(String mimeType, String fileName, Source<ByteString, ?> source)
        throws IOException {
        String escapedName = URLEncoder.encode(fileName, StandardCharsets.UTF_8);
        return CompletableFuture.completedFuture(
            ok()
                .chunked(
                    source
                        .via(new ChunkMaker(3 * (int) FileUtils.ONE_KB))
                        .map(byteString -> {
                            final byte[] encoded = Base64.getEncoder().encode(byteString.toArray());
                            return ByteString.fromArray(encoded);
                        })
                )
                .as(mimeType)
                .withHeader("Content-Disposition", "attachment; filename*=UTF-8''\"" + escapedName + "\"")
        );
    }

    default Optional<ExamSectionQuestion> getExamSectionQuestion(Long qid, Exam exam) {
        return exam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(q -> q.getId().equals(qid))
            .findFirst();
    }

    default MultipartForm getForm(Http.Request request) throws IllegalArgumentException {
        Http.MultipartFormData<TemporaryFile> body = request.body().asMultipartFormData();
        Http.MultipartFormData.FilePart<TemporaryFile> filePart = body.getFile("file");
        if (filePart == null) {
            throw new IllegalArgumentException("file not found");
        }
        Optional<String> contentLength = request.header("Content-Length");
        if (contentLength.isEmpty() || Long.parseLong(contentLength.get()) > getConfigReader().getMaxFileSize()) {
            throw new IllegalArgumentException("i18n_file_too_large");
        }
        return new MultipartForm(filePart, body.asFormUrlEncoded());
    }

    class MultipartForm {

        private final Http.MultipartFormData.FilePart<TemporaryFile> filePart;
        private final Map<String, String[]> form;

        MultipartForm(Http.MultipartFormData.FilePart<TemporaryFile> filePart, Map<String, String[]> form) {
            this.filePart = filePart;
            this.form = form;
        }

        public Http.MultipartFormData.FilePart<TemporaryFile> getFilePart() {
            return this.filePart;
        }

        public Map<String, String[]> getForm() {
            return this.form;
        }
    }
}
