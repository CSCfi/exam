// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop;

import static org.fest.assertions.Assertions.assertThat;

import base.RunAsStudent;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import com.google.common.collect.ImmutableMap;
import helpers.BaseServlet;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import models.attachment.Attachment;
import models.exam.Exam;
import models.iop.CollaborativeExam;
import models.questions.EssayAnswer;
import models.sections.ExamSectionQuestion;
import org.apache.pekko.stream.Materializer;
import org.apache.pekko.stream.javadsl.FileIO;
import org.apache.pekko.stream.javadsl.Source;
import org.apache.pekko.util.ByteString;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.test.Helpers;

public class CollaborativeAttachmentControllerTest
    extends BaseCollaborativeAttachmentControllerTest<CollaborativeExam> {

    private final String baseURL = "/app/iop/collab/attachment";

    @Test
    @RunAsTeacher
    public void testDownloadExamAttachmentAsTeacher() throws IOException {
        Result result = request(Helpers.GET, baseURL + "/exam/" + externalExam.getId(), null);
        assertThat(result.status()).isEqualTo(Helpers.OK);
        assertLastCall(Helpers.GET, attachmentServlet);
        assertDownloadResult(result);
    }

    @Test
    @RunAsTeacher
    public void testAddAttachmentToQuestionAsTeacher() throws Exception {
        getExamSectionQuestion(examServlet.getExam(), examSectionQuestion.getId()).getQuestion().setAttachment(null);
        final String path = "/question";
        uploadAttachment(
            path,
            ImmutableMap.of(
                "examId",
                externalExam.getId().toString(),
                "questionId",
                examSectionQuestion.getId().toString()
            )
        );
        examServlet.getWaiter().await(10000, 1);
        assertLastCall(Helpers.PUT, examServlet);
        final Exam exam = examServlet.getExam();
        final ExamSectionQuestion sq = getExamSectionQuestion(exam, examSectionQuestion.getId());
        final Attachment attachment = sq.getQuestion().getAttachment();
        assertThat(attachment).isNotNull();
        assertThat(attachment.getExternalId()).isEqualTo("abcdefg123456");
        assertThat(attachment.getFileName()).isEqualTo("test_image.png");
    }

    @Test
    @RunAsTeacher
    public void testDownloadQuestionAttachmentAsTeacher() throws IOException {
        String url = String.format(baseURL + "/exam/%d/question/%d", externalExam.getId(), examSectionQuestion.getId());
        Result result = request(Helpers.GET, url, null);
        assertThat(result.status()).isEqualTo(Helpers.OK);
        assertLastCall(Helpers.GET, attachmentServlet);
        assertDownloadResult(result);
    }

    @Test
    @RunAsStudent
    public void testAddAttachmentToQuestionAnswerAsStudent() throws Exception {
        uploadAttachment(
            "/question/answer",
            ImmutableMap.of(
                "examId",
                externalExam.getId().toString(),
                "questionId",
                examSectionQuestion.getId().toString()
            )
        );
        examServlet.getWaiter().await(10000, 1);
        assertLastCall(Helpers.PUT, examServlet);
        final Exam exam = examServlet.getExam();
        final ExamSectionQuestion examSectionQuestion = getExamSectionQuestion(exam);
        final Attachment attachment = examSectionQuestion.getEssayAnswer().getAttachment();
        assertThat(attachment).isNotNull();
        assertThat(attachment.getExternalId()).isEqualTo("abcdefg123456");
        assertThat(attachment.getFileName()).isEqualTo("test_image.png");
    }

    @Test
    @RunAsStudent
    public void testDeleteQuestionAnswerAttachmentAsStudent() throws Exception {
        final EssayAnswer essayAnswer = examSectionQuestion.getEssayAnswer();
        final Attachment attachment = createAttachment("test_image.png", testImage.getAbsolutePath(), "image/png");
        attachment.setExternalId("abcdefg12345");
        essayAnswer.setAttachment(attachment);
        examServlet.setExam(exam);

        Exam eBefore = examServlet.getExam();
        final ExamSectionQuestion sqBefore = getExamSectionQuestion(eBefore, examSectionQuestion.getId());
        assertThat(sqBefore.getEssayAnswer()).isNotNull();
        assertThat(sqBefore.getEssayAnswer().getAttachment()).isNotNull();

        final String s = String.format(
            baseURL + "/question/%d/answer/%s",
            examSectionQuestion.getId(),
            externalExam.getId()
        );
        final Result result = request(Helpers.DELETE, s, null);
        assertThat(result.status()).isEqualTo(Helpers.OK);
        assertLastCall(Helpers.DELETE, attachmentServlet);

        examServlet.getWaiter().await(10000, 1);
        Exam eAfter = examServlet.getExam();
        final ExamSectionQuestion sqAfter = getExamSectionQuestion(eAfter, examSectionQuestion.getId());
        assertThat(sqAfter.getEssayAnswer()).isNotNull();
        assertThat(sqAfter.getEssayAnswer().getAttachment()).isNull();
    }

    @Test
    @RunAsTeacher
    public void testDeleteQuestionAnswerAttachmentAsTeacher() {
        final String s = String.format(
            baseURL + "/question/%d/answer/%s",
            examSectionQuestion.getId(),
            externalExam.getId()
        );
        final Result result = request(Helpers.DELETE, s, null);
        assertThat(result.status()).isEqualTo(Helpers.FORBIDDEN);
    }

    private void assertLastCall(String method, BaseServlet servlet) {
        assertThat(servlet.getLastCallMethod()).isEqualTo(method);
    }

    private void uploadAttachment(String path, Map<String, String> idParts) {
        final Http.RequestBuilder requestBuilder = getRequestBuilder(Helpers.POST, baseURL + path);

        Materializer mat = app.injector().instanceOf(Materializer.class);

        final List<Http.MultipartFormData.Part<Source<ByteString, ?>>> dataParts = idParts
            .entrySet()
            .stream()
            .map(e -> new Http.MultipartFormData.DataPart(e.getKey(), e.getValue()))
            .collect(Collectors.toList());

        Source<ByteString, ?> src = FileIO.fromPath(testImage.toPath());
        Http.MultipartFormData.FilePart<Source<ByteString, ?>> fp = new Http.MultipartFormData.FilePart<>(
            "file",
            "test_image.png",
            "image/png",
            src
        );
        dataParts.add(fp);
        requestBuilder.bodyRaw(dataParts, new play.libs.Files.SingletonTemporaryFileCreator(), mat);
        Result result = Helpers.route(app, requestBuilder);
        assertThat(result.status()).isEqualTo(Helpers.CREATED);
        assertLastCall(Helpers.POST, attachmentServlet);

        final JsonNode attachmentJson = Json.parse(Helpers.contentAsString(result));
        assertThat(attachmentJson.get("mimeType").asText()).isEqualTo("image/png");
        assertThat(attachmentJson.get("externalId").asText()).isEqualTo("abcdefg123456");
        assertThat(attachmentJson.get("fileName").asText()).isEqualTo("test_image.png");
    }

    @Override
    void createExam() {
        externalExam = new CollaborativeExam();
        externalExam.setExternalRef(EXAM_HASH);
        externalExam.save();
    }
}
