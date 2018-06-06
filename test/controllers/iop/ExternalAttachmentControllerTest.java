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

import akka.actor.ActorSystem;
import akka.stream.ActorMaterializer;
import akka.stream.Materializer;
import akka.stream.javadsl.FileIO;
import akka.stream.javadsl.Source;
import akka.util.ByteString;
import backend.models.Attachment;
import backend.models.Exam;
import backend.models.ExamExecutionType;
import backend.models.ExamSectionQuestion;
import backend.models.json.ExternalExam;
import backend.models.questions.EssayAnswer;
import backend.models.questions.Question;
import base.IntegrationTestCase;
import base.RunAsStudent;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import helpers.AttachmentServlet;
import helpers.RemoteServerHelper;
import io.ebean.Ebean;
import net.jodah.concurrentunit.Waiter;
import org.apache.commons.io.FileUtils;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.jetbrains.annotations.NotNull;
import org.junit.After;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import play.Logger;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.test.Helpers;

import javax.servlet.MultipartConfigElement;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Base64;

import static org.fest.assertions.Assertions.assertThat;

public class ExternalAttachmentControllerTest extends IntegrationTestCase {

    private static final String EXAM_HASH = "0e6d16c51f857a20ab578f57f105032e";
    private static Server server;
    private static Path testUpload;
    private static File testImage = getTestFile("test_files/test_image.png");
    private static AttachmentServlet attachmentServlet;
    private ExternalExam externalExam;
    private ExamSectionQuestion examSectionQuestion;
    private Exam exam;

    @BeforeClass
    public static void startServer() throws Exception {
        server = new Server(31247);

        ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
        context.setContextPath("/api");

        testUpload = Files.createTempDirectory("test_upload");
        attachmentServlet = new AttachmentServlet(testImage);
        ServletHolder fileUploadServletHolder = new ServletHolder(
                attachmentServlet);
        fileUploadServletHolder.getRegistration().setMultipartConfig(new MultipartConfigElement(testUpload.toString()));
        context.addServlet(fileUploadServletHolder, "/*");

        server.setHandler(context);
        server.start();
    }

    @Before
    public void setUp() throws Exception {
        super.setUp();
        exam = Ebean.find(Exam.class, 1L);
        assert exam != null;
        exam.setExecutionType(Ebean.find(ExamExecutionType.class, 1L));
        exam.setExternal(true);
        final Attachment examAttachment = createAttachment("test_image.png", testImage.getAbsolutePath(),
                "image/png");
        examAttachment.setExternalId("ab123fcdgkk");
        exam.setAttachment(examAttachment);
        exam.save();

        examSectionQuestion = getExamSectionQuestion(exam);
        final EssayAnswer answer = new EssayAnswer();
        answer.setAnswer("Answer content");
        answer.save();
        examSectionQuestion.setEssayAnswer(answer);

        Question question = examSectionQuestion.getQuestion();
        final Attachment questionAttachment = createAttachment("test_image.png", testImage.getAbsolutePath(),
                "image/png");
        questionAttachment.setExternalId("9284774jdfjdfk");
        question.setAttachment(questionAttachment);
        question.save();

        externalExam = new ExternalExam();
        externalExam.setHash(EXAM_HASH);
        externalExam.save();
        externalExam.serialize(exam);

        attachmentServlet.setWaiter(new Waiter());
    }

    @After
    public void tearDown() {
        try {
            Logger.info("Cleaning test upload directory: {}", testUpload.toString());
            FileUtils.deleteDirectory(testUpload.toFile());
        } catch (IOException e) {
            Logger.error("Test upload directory delete failed!", e);
        }
        super.tearDown();
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        RemoteServerHelper.shutdownServer(server);
    }

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

        Http.MultipartFormData.DataPart hash = new Http.MultipartFormData.DataPart("hash", EXAM_HASH);
        Http.MultipartFormData.DataPart questionId =
                new Http.MultipartFormData.DataPart("questionId", examSectionQuestion.getId().toString());

        Source<ByteString, ?> src = FileIO.fromFile(testImage);
        Http.MultipartFormData.FilePart<Source<ByteString, ?>> fp =
                new Http.MultipartFormData.FilePart<>("file", "test_image.png", "image/png", src);

        requestBuilder.bodyMultipart(Arrays.asList(hash, questionId, fp),
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

    private void assertDownloadResult(Result result) throws IOException {
        assertThat(result.header("Content-Disposition").orElse(null))
                .isEqualTo("attachment; filename=\"test_image.png\"");
        ActorSystem actorSystem = ActorSystem.create("TestSystem");
        Materializer mat = ActorMaterializer.create(actorSystem);
        final String content = Helpers.contentAsString(result, mat);
        final byte[] decoded = Base64.getDecoder().decode(content);
        File f = new File(testUpload + "/image.png");
        FileUtils.writeByteArrayToFile(f, decoded);
        assertThat(FileUtils.contentEquals(f, testImage)).isTrue();
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
}