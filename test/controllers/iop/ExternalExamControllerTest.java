package controllers.iop;

import backend.models.Attachment;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamMachine;
import backend.models.ExamRoom;
import backend.models.ExamSection;
import backend.models.ExamSectionQuestion;
import backend.models.Language;
import backend.models.Reservation;
import backend.models.User;
import backend.models.iop.ExternalReservation;
import backend.models.questions.Question;
import backend.util.AppUtil;
import base.IntegrationTestCase;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.icegreen.greenmail.junit.GreenMailRule;
import com.icegreen.greenmail.util.ServerSetup;
import helpers.AttachmentServlet;
import helpers.RemoteServerHelper;
import io.ebean.Ebean;
import net.jodah.concurrentunit.Waiter;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.joda.time.DateTime;
import org.junit.After;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Rule;
import org.junit.Test;
import play.Logger;
import play.api.Play;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

import javax.servlet.MultipartConfigElement;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.StreamSupport;

import static org.fest.assertions.Assertions.assertThat;

public class ExternalExamControllerTest extends IntegrationTestCase {

    private static final String RESERVATION_REF = "0e6d16c51f857a20ab578f57f105032e";
    private static final String RESERVATION_REF_2 = "0e6d16c51f857a20ab578f57f105032f";
    private static final String ROOM_REF = "0e6d16c51f857a20ab578f57f1018456";
    private static final String HASH = "7cf002da-4263-4843-99b1-e8af51e"; // Has to match with the externalRef in test json file
    private static Path testUpload;
    private static Server server;
    private static File testImage = getTestFile("test_files/test_image.png");
    private static AttachmentServlet attachmentServlet;

    private Exam exam;
    private ExamEnrolment enrolment;
    private Reservation reservation = new Reservation();

    @Rule
    public final GreenMailRule greenMail = new GreenMailRule(new ServerSetup(11465, null, ServerSetup.PROTOCOL_SMTP));

    public static class EnrolmentServlet extends HttpServlet {

        @Override
        protected void doGet(HttpServletRequest request, HttpServletResponse response) {
            response.setContentType("application/json");
            response.setStatus(HttpServletResponse.SC_OK);

            File file = new File("test/resources/enrolment_with_lottery.json");
            try (FileInputStream fis = new FileInputStream(file); ServletOutputStream sos = response.getOutputStream()) {
                IOUtils.copy(fis, sos);
                sos.flush();
            } catch (IOException e) {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        }

        @Override
        protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
            resp.setContentType("application/json");
            if (req.getPathInfo().contains("/attachments")) {
                resp.setStatus(HttpServletResponse.SC_CREATED);
                resp.getWriter().write(String.format("{\"id\": \"%s\"}", UUID.randomUUID()));
                resp.getWriter().flush();
                return;
            }
            resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
        }
    }

    @BeforeClass
    public static void startServer() throws Exception {
        server = new Server(31247);

        ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
        context.setContextPath("/api");

        testUpload = Files.createTempDirectory("test_upload");
        ServletHolder fileUploadServletHolder = new ServletHolder(new EnrolmentServlet());
        fileUploadServletHolder.getRegistration().setMultipartConfig(new MultipartConfigElement(testUpload.toString()));
        context.addServlet(fileUploadServletHolder, "/enrolments/*");
        attachmentServlet = new AttachmentServlet(testImage);
        final ServletHolder attachmentServletHolder = new ServletHolder(attachmentServlet);
        attachmentServletHolder.getRegistration().setMultipartConfig(new MultipartConfigElement(testUpload.toString()));
        context.addServlet(attachmentServletHolder, "/attachments/*");

        server.setHandler(context);
        server.start();
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        RemoteServerHelper.shutdownServer(server);
    }

    @Override
    protected void onBeforeLogin() {
        User user = Ebean.find(User.class, userId == null ? 3L : userId);
        ExamRoom room = Ebean.find(ExamRoom.class, 1L);
        ExamMachine machine = room.getExamMachines().get(0);
        machine.setIpAddress("127.0.0.1"); // so that the IP check won't fail
        machine.update();
        reservation.setMachine(machine);
        reservation.setUser(user);
        reservation.setStartAt(DateTime.now().plusMinutes(10));
        reservation.setEndAt(DateTime.now().plusMinutes(70));
        reservation.setExternalUserRef(user.getEppn());
        reservation.setExternalRef(RESERVATION_REF);
        reservation.save();
    }

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();
        Ebean.deleteAll(Ebean.find(ExamEnrolment.class).findList());
        exam = Ebean.find(Exam.class).fetch("examSections").fetch("examSections.sectionQuestions").where().idEq(1L).findUnique();
        initExamSectionQuestions(exam);
        exam.setExamActiveStartDate(DateTime.now().minusDays(1));
        exam.setExamActiveEndDate(DateTime.now().plusDays(1));
        exam.setHash(HASH);
        exam.update();
        User user = Ebean.find(User.class, 1L);
        user.setLanguage(Ebean.find(Language.class, "en"));
        user.update();
        ExamRoom room = Ebean.find(ExamRoom.class, 1L);
        room.setExternalRef(ROOM_REF);
        room.getExamMachines().get(0).setIpAddress("127.0.0.1");
        room.getExamMachines().get(0).update();
        room.update();

        enrolment = new ExamEnrolment();
        enrolment.setExam(exam);
        enrolment.setUser(user);
        enrolment.save();
        attachmentServlet.setWaiter(new Waiter());
    }

    @After
    @Override
    public void tearDown() {
        try {
            Logger.info("Cleaning test upload directory: {}", testUpload.toString());
            FileUtils.deleteDirectory(testUpload.toFile());
        } catch (IOException e) {
            Logger.error("Test upload directory delete failed!", e);
        }
        super.tearDown();
    }

    @Test
    public void testRequestEnrolment() throws Exception {
        login("student@funet.fi");
        Reservation external = Ebean.find(Reservation.class)
                .fetch("enrolment")
                .fetch("enrolment.externalExam").where().idEq(reservation.getId()).findOne();
        assertThat(external.getEnrolment()).isNotNull();
        assertThat(external.getEnrolment().getExternalExam()).isNotNull();
        // Check that lottery was taken in effect
        Exam exam = external.getEnrolment().getExternalExam().deserialize();
        Optional<ExamSection> s1 = exam.getExamSections().stream().filter(ExamSection::getLotteryOn).findFirst();
        assertThat(s1.isPresent());
        assertThat(s1.get().getSectionQuestions()).hasSize(s1.get().getLotteryItemCount());
    }

    @Test
    public void testReceiveExamAttainment() throws Exception {
        Reservation reservation = new Reservation();
        reservation.setExternalRef(RESERVATION_REF);
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
        //reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();

        enrolment.setReservation(reservation);
        enrolment.update();
        ObjectMapper om = new ObjectMapper();
        JsonNode node = om.readTree(new File("test/resources/externalExamAttainment.json"));
        Result result = request(Helpers.POST, "/integration/iop/exams/" + RESERVATION_REF, node);
        assertThat(result.status()).isEqualTo(201);

        Exam attainment = Ebean.find(Exam.class).where().eq("parent", exam).findUnique();
        assertThat(attainment).isNotNull();
        // Auto-evaluation expected to occur so state should be GRADED
        assertThat(attainment.getState()).isEqualTo(Exam.State.GRADED);

        attachmentServlet.getWaiter().await(10000, 3);

        String uploadPath = AppUtil.getAttachmentPath(Play.current().environment().asJava()).toString();
        final Path path = FileSystems.getDefault().getPath(uploadPath);
        assertThat(path.toFile().mkdirs()).isTrue();

        long start = System.currentTimeMillis();
        int expectedFileCount = 3;
        Collection<File> files = new ArrayList<>();
        while (System.currentTimeMillis() < start + 10000) {
            files = FileUtils.listFiles(path.toFile(), null, true);
            if (files.size() >= expectedFileCount) {
                break;
            }
            Thread.sleep(200);
        }
        assertThat(files.size()).isEqualTo(expectedFileCount);
        files.forEach(file -> Logger.info(file.toString()));
        // Check that we can review it
        loginAsAdmin();
        result = get("/app/review/" + attainment.getId());
        assertThat(result.status()).isEqualTo(200);
    }

    @Test
    public void testReceiveNoShow() throws Exception {
        Reservation reservation = new Reservation();
        reservation.setExternalRef(RESERVATION_REF_2);
        reservation.setStartAt(DateTime.now().minusHours(3));
        reservation.setEndAt(DateTime.now().minusHours(2));
        reservation.setUser(Ebean.find(User.class).where().eq("firstName", "Sauli").findOne());
        //reservation.setMachine(room.getExamMachines().get(0));
        ExternalReservation er = new ExternalReservation();
        er.setOrgRef("org1");
        er.setRoomRef("room2");
        er.setMachineName("machine3");
        er.setRoomName("room named 4");
        er.save();
        reservation.setExternalReservation(er);
        reservation.save();

        enrolment.setReservation(reservation);
        enrolment.update();

        Result result = request(Helpers.POST, "/integration/iop/reservations/" + RESERVATION_REF_2 + "/noshow",
                Json.newObject());
        assertThat(result.status()).isEqualTo(200);

        Reservation r = Ebean.find(Reservation.class).where().eq("externalRef", RESERVATION_REF_2).findUnique();
        assertThat(r).isNotNull();
        assertThat(r.isNoShow()).isTrue();
    }

    @Test
    public void testProvideEnrolmentWithAttachments() throws Exception {
        final File testFile = getTestFile("test_files/test.txt");
        final Attachment examAttachment = createAttachment("test.txt", testFile.getAbsolutePath(),
                "plain/text");
        final File testImage = getTestFile("test_files/test_image.png");
        final Attachment questionAttachment = createAttachment("test_image.png", testImage.getAbsolutePath(),
                "image/png");

        exam.setAttachment(examAttachment);
        exam.save();

        enrolment.setReservation(reservation);
        enrolment.save();

        final ExamSectionQuestion sectionQuestion = getExamSectionQuestion(exam);
        final Question question = sectionQuestion.getQuestion();
        question.setAttachment(questionAttachment);
        question.save();

        Result result = request(Helpers.GET, "/integration/iop/reservations/" + RESERVATION_REF, null);
        assertThat(result.status()).isEqualTo(200);
        final JsonNode jsonNode = Json.parse(Helpers.contentAsString(result));
        assertThat(jsonNode).isNotNull();
        assertAttachment(examAttachment, jsonNode.path("attachment"));

        final JsonNode questionJson = StreamSupport.stream(jsonNode.path("examSections").spliterator(), false)
                .flatMap(node -> StreamSupport.stream(node.path("sectionQuestions").spliterator(), false))
                .filter(node -> node.get("id").asLong() == sectionQuestion.getId())
                .map(node -> node.path("question"))
                .filter(node -> node.get("id").asLong() == question.getId())
                .findFirst()
                .orElseThrow(() -> new Exception("Question not found!"));
        assertAttachment(questionAttachment, questionJson.path("attachment"));
        attachmentServlet.getWaiter().await(10000, 2);
        assertThat(new File(testUpload.toString() + "/" + "test.txt").exists()).isTrue();
        assertThat(new File(testUpload.toString() + "/" + "test_image.png").exists()).isTrue();
    }

    private void assertAttachment(Attachment attachment, JsonNode json) {
        assertThat(json).isNotNull();
        assertThat(json.get("fileName").asText()).isEqualTo(attachment.getFileName());
        assertThat(json.get("mimeType").asText()).isEqualTo(attachment.getMimeType());
        assertThat(json.get("filePath").asText()).isEqualTo(attachment.getFilePath());
        assertThat(json.get("externalId").isNull()).isFalse();
    }

}
