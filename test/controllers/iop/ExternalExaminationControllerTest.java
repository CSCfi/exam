package controllers.iop;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import backend.models.*;
import backend.models.json.ExternalExam;
import backend.models.questions.ClozeTestAnswer;
import backend.models.questions.EssayAnswer;
import backend.models.questions.Question;
import backend.models.sections.ExamSectionQuestion;
import backend.models.sections.ExamSectionQuestionOption;
import backend.util.json.JsonDeserializer;
import base.IntegrationTestCase;
import base.RunAsStudent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.common.io.Files;
import com.icegreen.greenmail.junit.GreenMailRule;
import com.icegreen.greenmail.util.ServerSetup;
import io.ebean.Ebean;
import io.ebean.text.json.EJson;
import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.UUID;
import org.joda.time.DateTime;
import org.junit.Rule;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

public class ExternalExaminationControllerTest extends IntegrationTestCase {
    private Exam exam;
    private ExternalExam ee;

    private ExamEnrolment enrolment = new ExamEnrolment();
    private ExamMachine machine;
    private Reservation reservation = new Reservation();

    @Rule
    public final GreenMailRule greenMail = new GreenMailRule(new ServerSetup(11465, null, ServerSetup.PROTOCOL_SMTP));

    @Override
    protected void onBeforeLogin() throws IOException {
        Ebean.deleteAll(Ebean.find(ExamEnrolment.class).findList());

        User user = Ebean.find(User.class, userId == null ? 3L : userId);
        ee = new ExternalExam();
        ee.setExternalRef(UUID.randomUUID().toString());
        ee.setHash(UUID.randomUUID().toString());
        ee.setCreated(DateTime.now());
        ee.setCreator(user);
        ee.setContent(
            EJson.parseObject(
                Files.asCharSource(new File("test/resources/enrolment.json"), Charset.forName("UTF-8")).read()
            )
        );
        ExamRoom room = Ebean.find(ExamRoom.class, 1L);
        machine = room.getExamMachines().get(0);
        machine.setIpAddress("127.0.0.1"); // so that the IP check won't fail
        machine.update();
        reservation.setMachine(machine);
        reservation.setUser(user);
        reservation.setStartAt(DateTime.now().minusMinutes(10));
        reservation.setEndAt(DateTime.now().plusMinutes(70));
        reservation.setExternalUserRef(user.getEppn());
        reservation.setExternalRef("foobar");
        reservation.save();

        enrolment.setExternalExam(ee);
        enrolment.setUser(user);
        enrolment.setReservation(reservation);
        enrolment.save();

        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(ee.getContent());
        JsonNode node = mapper.readTree(json);
        exam = JsonDeserializer.deserialize(Exam.class, node);
    }

    @Test
    @RunAsStudent
    public void testCreateStudentExam() throws Exception {
        // Execute
        Result result = get("/app/student/exam/" + enrolment.getExternalExam().getHash());
        assertThat(result.status()).isEqualTo(303);
        result = get(result.redirectLocation().get());
        assertThat(result.status()).isEqualTo(200);

        // Verify
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);
        assertThat(studentExam.getName()).isEqualTo(exam.getName());
        assertThat(studentExam.getCourse().getId()).isEqualTo(exam.getCourse().getId());
        assertThat(studentExam.getInstruction()).isEqualTo(exam.getInstruction());
        assertThat(studentExam.getExamSections()).hasSize(exam.getExamSections().size());
        assertThat(studentExam.getExamSections().iterator().next().getSectionQuestions())
            .hasSize(exam.getExamSections().iterator().next().getSectionQuestions().size());
        assertThat(studentExam.getHash()).isEqualTo(exam.getHash());
        assertThat(studentExam.getExamLanguages()).hasSize(exam.getExamLanguages().size());

        assertThat(studentExam.getDuration()).isEqualTo(exam.getDuration());
    }

    @Test
    @RunAsStudent
    public void testCreateStudentExamWrongIP() throws Exception {
        machine.setIpAddress("127.0.0.2");
        machine.update();

        // Execute
        Result result = get("/app/student/exam/" + enrolment.getExternalExam().getHash());
        assertThat(result.status()).isEqualTo(303);
        result = get(result.redirectLocation().get());
        assertThat(result.status()).isEqualTo(403);
    }

    @Test
    @RunAsStudent
    public void testCreateStudentExamAlreadyCreated() throws Exception {
        // Execute
        Result result = get("/app/student/exam/" + enrolment.getExternalExam().getHash(), true);
        assertThat(result.status()).isEqualTo(200);
        DateTime started = Ebean
            .find(ExternalExam.class)
            .where()
            .eq("hash", enrolment.getExternalExam().getHash())
            .findOne()
            .getStarted();

        // Try again
        result = get("/app/student/exam/" + enrolment.getExternalExam().getHash(), true);
        assertThat(result.status()).isEqualTo(200);

        // Check that starting time did not change
        assertThat(
            Ebean
                .find(ExternalExam.class)
                .where()
                .eq("hash", enrolment.getExternalExam().getHash())
                .findOne()
                .getStarted()
        )
            .isEqualTo(started);
    }

    @Test
    @RunAsStudent
    public void testAnswerMultiChoiceQuestion() throws Exception {
        Result result = get("/app/student/exam/" + enrolment.getExternalExam().getHash(), true);

        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);

        ExamSectionQuestion question = studentExam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getQuestion().getType() == Question.Type.MultipleChoiceQuestion)
            .findFirst()
            .get();
        Iterator<ExamSectionQuestionOption> it = question.getOptions().iterator();
        ExamSectionQuestionOption option = it.next();
        result =
            request(
                Helpers.POST,
                String.format(
                    "/app/iop/student/exam/%s/question/%d/option",
                    enrolment.getExternalExam().getHash(),
                    question.getId()
                ),
                createMultipleChoiceAnswerData(option),
                true
            );
        assertThat(result.status()).isEqualTo(200);

        // Check that an option was marked as answered in the database
        ExternalExam savedExternalExam = Ebean.find(ExternalExam.class).where().eq("hash", ee.getHash()).findOne();
        Exam savedExam = savedExternalExam.deserialize();
        ExamSectionQuestion savedQuestion = savedExam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getId().equals(question.getId()))
            .findFirst()
            .get();
        assertThat(savedQuestion.getOptions().stream().filter(ExamSectionQuestionOption::isAnswered).count())
            .isPositive();
    }

    @Test
    @RunAsStudent
    public void testAnswerMultiChoiceQuestionWrongIP() throws Exception {
        Result result = get("/app/student/exam/" + enrolment.getExternalExam().getHash(), true);

        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);

        ExamSectionQuestion question = studentExam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getQuestion().getType() == Question.Type.MultipleChoiceQuestion)
            .findFirst()
            .get();
        Iterator<ExamSectionQuestionOption> it = question.getOptions().iterator();
        ExamSectionQuestionOption option = it.next();

        // Change IP of reservation machine to simulate that student is on different machine now
        machine.setIpAddress("127.0.0.2");
        machine.update();

        result =
            request(
                Helpers.POST,
                String.format(
                    "/app/iop/student/exam/%s/question/%d/option",
                    enrolment.getExternalExam().getHash(),
                    question.getId()
                ),
                createMultipleChoiceAnswerData(option),
                true
            );
        assertThat(result.status()).isEqualTo(403);
    }

    @Test
    @RunAsStudent
    public void testDoExam() throws Exception {
        String hash = enrolment.getExternalExam().getHash();
        Result result = get("/app/student/exam/" + enrolment.getExternalExam().getHash(), true);
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);
        studentExam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().parallelStream())
            .forEach(
                esq -> {
                    Question question = esq.getQuestion();
                    Result r;
                    switch (question.getType()) {
                        case EssayQuestion:
                            ObjectNode body = Json.newObject().put("answer", "this is my answer");
                            EssayAnswer answer = esq.getEssayAnswer();
                            if (answer != null && answer.getObjectVersion() > 0) {
                                body.put("objectVersion", answer.getObjectVersion());
                            }
                            r =
                                request(
                                    Helpers.POST,
                                    String.format("/app/iop/student/exam/%s/question/%d", hash, esq.getId()),
                                    body,
                                    true
                                );
                            assertThat(r.status()).isEqualTo(200);
                            break;
                        case ClozeTestQuestion:
                            ObjectNode content = (ObjectNode) Json
                                .newObject()
                                .set(
                                    "answer",
                                    Json
                                        .newObject()
                                        .put("1", "this is my answer for cloze 1")
                                        .put("2", "this is my answer for cloze 2")
                                );
                            ClozeTestAnswer clozeAnswer = esq.getClozeTestAnswer();
                            if (clozeAnswer != null && clozeAnswer.getObjectVersion() > 0) {
                                content.put("objectVersion", clozeAnswer.getObjectVersion());
                            }
                            r =
                                request(
                                    Helpers.POST,
                                    String.format("/app/iop/student/exam/%s/clozetest/%d", hash, esq.getId()),
                                    content
                                );
                            assertThat(r.status()).isEqualTo(200);
                            break;
                        default:
                            Iterator<ExamSectionQuestionOption> it = esq.getOptions().iterator();
                            ExamSectionQuestionOption option = it.next();
                            r =
                                request(
                                    Helpers.POST,
                                    String.format("/app/iop/student/exam/%s/question/%d/option", hash, esq.getId()),
                                    createMultipleChoiceAnswerData(option),
                                    true
                                );
                            assertThat(r.status()).isEqualTo(200);
                            break;
                    }
                }
            );
        result = request(Helpers.PUT, String.format("/app/iop/student/exam/%s", hash), null);
        assertThat(result.status()).isEqualTo(200);
        ExternalExam turnedExam = Ebean.find(ExternalExam.class).where().eq("hash", hash).findOne();
        assertThat(turnedExam.getFinished()).isNotNull();
        Exam content = turnedExam.deserialize();
        assertThat(content.getState()).isEqualTo(Exam.State.REVIEW);
        // Briefly check that some of the above answers are there
        String textualExam = asString(content);
        assertThat(textualExam).contains("cloze 1");
        assertThat(textualExam).contains("cloze 2");
        assertThat(textualExam).contains("this is my answer");
    }

    private String asString(Exam exam) throws Exception {
        ObjectMapper om = new ObjectMapper();
        return om.writeValueAsString(exam);
    }

    private JsonNode createMultipleChoiceAnswerData(ExamSectionQuestionOption... options) {
        ArrayNode array = Json.newArray();
        for (ExamSectionQuestionOption option : options) {
            array.add(option.getId());
        }
        return Json.newObject().set("oids", array);
    }

    @Test
    @RunAsStudent
    public void testAnswerSkipOnClaimChoiceQuestion() throws Exception {
        Result result = get("/app/student/exam/" + enrolment.getExternalExam().getHash(), true);
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);

        ExamSectionQuestion question = studentExam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getQuestion().getType() == Question.Type.ClaimChoiceQuestion)
            .findFirst()
            .get();

        List<ExamSectionQuestionOption> options = new ArrayList<>(question.getOptions());

        assertThat(options.get(0).getOption().getOption()).isEqualTo("Tosi");
        assertThat(options.get(1).getOption().getOption()).isEqualTo("Epätosi");
        assertThat(options.get(2).getOption().getOption()).isEqualTo("En osaa sanoa");

        result =
            request(
                Helpers.POST,
                String.format(
                    "/app/iop/student/exam/%s/question/%d/option",
                    enrolment.getExternalExam().getHash(),
                    question.getId()
                ),
                createMultipleChoiceAnswerData(options.get(2)),
                true
            );
        assertThat(result.status()).isEqualTo(200);
    }
}
