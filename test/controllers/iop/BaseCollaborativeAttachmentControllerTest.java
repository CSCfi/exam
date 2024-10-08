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

import static org.fest.assertions.Assertions.assertThat;

import base.IntegrationTestCase;
import helpers.AttachmentServlet;
import helpers.ExamServlet;
import helpers.RemoteServerHelper;
import io.ebean.DB;
import jakarta.servlet.MultipartConfigElement;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import models.Attachment;
import models.Exam;
import models.ExamExecutionType;
import models.questions.EssayAnswer;
import models.questions.Question;
import models.sections.ExamSectionQuestion;
import net.jodah.concurrentunit.Waiter;
import org.apache.commons.io.FileUtils;
import org.apache.pekko.actor.ActorSystem;
import org.apache.pekko.stream.Materializer;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.junit.After;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import play.Logger;
import play.mvc.Result;
import play.test.Helpers;

public abstract class BaseCollaborativeAttachmentControllerTest<T> extends IntegrationTestCase {

    private static final Logger.ALogger logger = Logger.of(BaseCollaborativeAttachmentControllerTest.class);

    static final String EXAM_HASH = "0e6d16c51f857a20ab578f57f105032e";
    private static Server server;
    private static Path testUpload;
    static File testImage = getTestFile("test_files/test_image.png");
    static AttachmentServlet attachmentServlet;
    static ExamServlet examServlet;
    T externalExam;
    ExamSectionQuestion examSectionQuestion;
    static Exam exam;

    @BeforeClass
    public static void startServer() throws Exception {
        server = new Server(31247);

        ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
        context.setContextPath("/api");

        testUpload = Files.createTempDirectory("test_upload");
        attachmentServlet = new AttachmentServlet(testImage);
        examServlet = new ExamServlet();
        ServletHolder fileUploadServletHolder = new ServletHolder(attachmentServlet);
        fileUploadServletHolder.getRegistration().setMultipartConfig(new MultipartConfigElement(testUpload.toString()));
        context.addServlet(fileUploadServletHolder, "/attachments/*");
        context.addServlet(new ServletHolder(examServlet), "/exams/*");

        server.setHandler(context);
        server.start();
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        RemoteServerHelper.shutdownServer(server);
    }

    @Before
    public void setUp() throws Exception {
        super.setUp();
        exam = DB.find(Exam.class, 1L);
        assert exam != null;
        exam.setExecutionType(DB.find(ExamExecutionType.class, 1L));
        exam.setExternal(true);
        final Attachment examAttachment = createAttachment("test_image.png", testImage.getAbsolutePath(), "image/png");
        examAttachment.setExternalId("ab123fcdgkk");
        exam.setAttachment(examAttachment);
        exam.save();

        examSectionQuestion = getExamSectionQuestion(exam);
        final EssayAnswer answer = new EssayAnswer();
        answer.setAnswer("Answer content");
        answer.save();
        examSectionQuestion.setEssayAnswer(answer);

        Question question = examSectionQuestion.getQuestion();
        final Attachment questionAttachment = createAttachment(
            "test_image.png",
            testImage.getAbsolutePath(),
            "image/png"
        );
        questionAttachment.setExternalId("9284774jdfjdfk");
        question.setAttachment(questionAttachment);
        question.save();

        createExam();

        attachmentServlet.setWaiter(new Waiter());
        examServlet.setExam(exam);
        examServlet.setWaiter(new Waiter());
    }

    void assertDownloadResult(Result result) throws IOException {
        assertThat(result.header("Content-Disposition").orElse(null))
            .isEqualTo("attachment; filename*=UTF-8''\"test_image.png\"");
        ActorSystem actorSystem = ActorSystem.create("TestSystem");
        Materializer mat = Materializer.createMaterializer(actorSystem);
        final String content = Helpers.contentAsString(result, mat);
        final byte[] decoded = Base64.getDecoder().decode(content);
        File f = new File(testUpload + "/image.png");
        FileUtils.writeByteArrayToFile(f, decoded);
        assertThat(FileUtils.contentEquals(f, testImage)).isTrue();
    }

    abstract void createExam();

    @After
    public void tearDown() {
        try {
            logger.info("Cleaning test upload directory: {}", testUpload.toString());
            FileUtils.deleteDirectory(testUpload.toFile());
        } catch (IOException e) {
            logger.error("Test upload directory delete failed!", e);
        }
        super.tearDown();
    }
}
