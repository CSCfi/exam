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

package controllers.iop;

import java.io.IOException;
import java.util.Arrays;
import javax.validation.constraints.NotNull;

import akka.stream.Materializer;
import akka.stream.javadsl.FileIO;
import akka.stream.javadsl.Source;
import akka.util.ByteString;
import base.RunAsStudent;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.Ebean;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.test.Helpers;

import backend.models.Attachment;
import backend.models.Exam;
import backend.models.sections.ExamSectionQuestion;
import backend.models.json.ExternalExam;
import backend.models.questions.EssayAnswer;

import static org.fest.assertions.Assertions.assertThat;

public class ExternalAttachmentControllerTest extends BaseCollaborativeAttachmentControllerTest<ExternalExam> {

    @Test
    @RunAsTeacher
    public void testDownloadExamAttachmentAsTeacher() throws IOException {
        Result result = requestExamAttachment(200);
        assertLastCall(Helpers.GET);
        assertDownloadResult(result);
    }

    @Test
    @RunAsStudent
    public void testDownloadExamAttachmentAsStudent() throws IOException {
        requestExamAttachment(404);
        externalExam.setCreator(getLoggerUser());
        externalExam.save();
        final Result result = requestExamAttachment(200);
        assertLastCall(Helpers.GET);
        assertDownloadResult(result);
    }

    @Test
    @RunAsTeacher
    public void testDownloadQuestionAttachmentAsTeacher() throws IOException {
        String url = String.format("/app/iop/attachment/exam/%s/question/%d",
                EXAM_HASH, examSectionQuestion.getId());
        Result result = request(Helpers.GET, url, null);
        assertThat(result.status()).isEqualTo(200);
        assertLastCall(Helpers.GET);
        assertDownloadResult(result);
    }

    @Test
    @RunAsStudent
    public void testAddAttachmentToQuestionAnswer() throws Exception {
        externalExam.setCreator(getLoggerUser());
        externalExam.save();

        final Http.RequestBuilder requestBuilder =
                getRequestBuilder(Helpers.POST, "/app/iop/attachment/question/answer");

        Materializer mat = app.injector().instanceOf(Materializer.class);

        Http.MultipartFormData.DataPart examId = new Http.MultipartFormData.DataPart("examId", EXAM_HASH);
        Http.MultipartFormData.DataPart questionId =
                new Http.MultipartFormData.DataPart("questionId", examSectionQuestion.getId().toString());

        Source<ByteString, ?> src = FileIO.fromPath(testImage.toPath());
        Http.MultipartFormData.FilePart<Source<ByteString, ?>> fp =
                new Http.MultipartFormData.FilePart<>("file", "test_image.png", "image/png", src);

        requestBuilder.bodyRaw(Arrays.asList(examId, questionId, fp),
                new play.libs.Files.SingletonTemporaryFileCreator(), mat);
        Result result = Helpers.route(app, requestBuilder);
        assertThat(result.status()).isEqualTo(201);
        assertLastCall(Helpers.POST);

        final JsonNode attachmentJson = Json.parse(Helpers.contentAsString(result));
        assertThat(attachmentJson.get("mimeType").asText()).isEqualTo("image/png");
        assertThat(attachmentJson.get("externalId").asText()).isEqualTo("abcdefg123456");
        assertThat(attachmentJson.get("fileName").asText()).isEqualTo("test_image.png");

        Ebean.refresh(externalExam);
        final Exam e = externalExam.deserialize();
        final ExamSectionQuestion sq = getExamSectionQuestion(e, examSectionQuestion.getId());
        assertThat(sq.getEssayAnswer()).isNotNull();
        assertThat(sq.getEssayAnswer().getAttachment()).isNotNull();
        assertThat(sq.getEssayAnswer().getAttachment().getExternalId()).isEqualTo("abcdefg123456");
    }

    @Test
    @RunAsStudent
    public void testDeleteQuestionAnswerAttachment() throws Exception {
        externalExam.setCreator(getLoggerUser());
        externalExam.save();

        final EssayAnswer essayAnswer = examSectionQuestion.getEssayAnswer();
        final Attachment attachment = createAttachment("test_image.png", testImage.getAbsolutePath(),
                "image/png");
        attachment.setExternalId("abcdefg12345");
        essayAnswer.setAttachment(attachment);
        externalExam.serialize(exam);

        final String s = String.format("/app/iop/attachment/question/%d/answer/%s", examSectionQuestion.getId(), EXAM_HASH);
        final Result result = request(Helpers.DELETE, s, null);
        assertThat(result.status()).isEqualTo(200);
        assertLastCall(Helpers.DELETE);

        Ebean.refresh(externalExam);
        final Exam e = externalExam.deserialize();
        final ExamSectionQuestion sq = getExamSectionQuestion(e, examSectionQuestion.getId());
        assertThat(sq.getEssayAnswer()).isNotNull();
        assertThat(sq.getEssayAnswer().getAttachment()).isNull();
    }

    @NotNull
    private Result requestExamAttachment(int status) {
        Result result = request(Helpers.GET, "/app/iop/attachment/exam/" + EXAM_HASH, null);
        assertThat(result.status()).isEqualTo(status);
        return result;
    }

    private void assertLastCall(String method) {
        assertThat(attachmentServlet.getLastCallMethod()).isEqualTo(method);
    }

    @Override
    void createExam() {
        externalExam = new ExternalExam();
        externalExam.setHash(EXAM_HASH);
        externalExam.save();
        try {
            externalExam.serialize(exam);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
