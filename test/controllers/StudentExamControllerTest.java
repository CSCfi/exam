package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.icegreen.greenmail.junit.GreenMailRule;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetup;
import com.typesafe.config.ConfigFactory;
import models.*;
import models.questions.EssayAnswer;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import org.joda.time.DateTime;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

import javax.mail.internet.MimeMessage;
import java.util.HashSet;
import java.util.Iterator;
import java.util.TreeSet;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

public class StudentExamControllerTest extends IntegrationTestCase {

    private Exam exam;
    private User user;

    private ExamEnrolment enrolment = new ExamEnrolment();
    private ExamMachine machine;
    private Reservation reservation = new Reservation();

    @Rule
    public final GreenMailRule greenMail = new GreenMailRule(new ServerSetup(11465, null, ServerSetup.PROTOCOL_SMTP));

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();
        Ebean.deleteAll(Ebean.find(ExamEnrolment.class).findList());
        exam = Ebean.find(Exam.class).fetch("examSections").fetch("examSections.sectionQuestions").where().idEq(1L).findUnique();
        exam.setExamSections(new TreeSet<>(exam.getExamSections()));
        exam.getExamInspections().stream().map(ExamInspection::getUser).forEach(u -> {
            u.setLanguage(Ebean.find(Language.class, "en"));
            u.update();
        });
        exam.getExamSections().stream()
                .flatMap(es -> es.getSectionQuestions().stream())
                .filter(esq -> esq.getQuestion().getType() != Question.Type.EssayQuestion)
                .forEach(esq -> {
                    for (MultipleChoiceOption o : esq.getQuestion().getOptions()) {
                        ExamSectionQuestionOption esqo = new ExamSectionQuestionOption();
                        esqo.setOption(o);
                        esqo.setScore(o.getDefaultScore());
                        esq.getOptions().add(esqo);
                    }
                    esq.save();
                });

        user = Ebean.find(User.class, userId);
        ExamRoom room = Ebean.find(ExamRoom.class, 1L);
        machine = room.getExamMachines().get(0);
        machine.setIpAddress("127.0.0.1"); // so that the IP check won't fail
        machine.update();
        reservation.setMachine(machine);
        reservation.setUser(user);
        reservation.setStartAt(DateTime.now().minusMinutes(10).toDate());
        reservation.setEndAt(DateTime.now().plusMinutes(70).toDate());
        reservation.save();
        enrolment.setExam(exam);
        enrolment.setUser(user);
        enrolment.setReservation(reservation);
        enrolment.save();
    }

    private void setAutoEvaluationConfig() {
        AutoEvaluationConfig config = new AutoEvaluationConfig();
        config.setReleaseType(AutoEvaluationConfig.ReleaseType.IMMEDIATE);
        config.setGradeEvaluations(new HashSet<>());
        exam.getGradeScale().getGrades().forEach(g -> {
            GradeEvaluation ge = new GradeEvaluation();
            ge.setGrade(g);
            ge.setPercentage(20 * Integer.parseInt(g.getName()));
            config.getGradeEvaluations().add(ge);
        });
        config.setExam(exam);
        config.save();
    }

    @Test
    @RunAsStudent
    public void testCreateStudentExam() throws Exception {
        // Execute
        Result result = request(Helpers.POST, "/app/student/exam/" + exam.getHash(), null);
        assertThat(result.status()).isEqualTo(200);

        // Verify
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);
        assertThat(studentExam.getName()).isEqualTo(exam.getName());
        assertThat(studentExam.getCourse().getId()).isEqualTo(exam.getCourse().getId());
        assertThat(studentExam.getInstruction()).isEqualTo(exam.getInstruction());
        assertThat(studentExam.getExamSections()).hasSize(exam.getExamSections().size());
        assertThat(studentExam.getExamSections().iterator().next().getSectionQuestions()).hasSize(
                exam.getExamSections().iterator().next().getSectionQuestions().size());
        assertThat(studentExam.getHash()).isNotEqualTo(exam.getHash());
        assertThat(studentExam.getExamLanguages()).hasSize(exam.getExamLanguages().size());

        assertThat(studentExam.getDuration()).isEqualTo(exam.getDuration());

        assertThat(Ebean.find(Exam.class).where().eq("hash", studentExam.getHash()).findUnique()).isNotNull();
        assertThat(Ebean.find(ExamEnrolment.class, enrolment.getId()).getExam().getHash()).isEqualTo(studentExam.getHash());

        ExamParticipation participation = Ebean.find(ExamParticipation.class).where().eq("exam.id", studentExam.getId()).findUnique();
        assertThat(participation.getStarted()).isNotNull();
        assertThat(participation.getUser().getId()).isEqualTo(user.getId());
    }

    @Test
    @RunAsStudent
    public void testAnswerMultiChoiceQuestion() throws Exception {
        Result result = request(Helpers.POST, "/app/student/exam/" + exam.getHash(), null);
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);
        ExamSectionQuestion question = Ebean.find(ExamSectionQuestion.class).where()
                .eq("examSection.exam", studentExam)
                .eq("question.type", Question.Type.MultipleChoiceQuestion)
                .findList()
                .get(0);
        Iterator<ExamSectionQuestionOption> it = question.getOptions().iterator();
        ExamSectionQuestionOption option = it.next();
        result = request(Helpers.POST, String.format("/app/student/exams/%s/question/%d/option", studentExam.getHash(),
                question.getId()), createMultipleChoiceAnswerData(option));
        assertThat(result.status()).isEqualTo(200);


        // Change answer
        option = it.next();
        result = request(Helpers.POST, String.format("/app/student/exams/%s/question/%d/option", studentExam.getHash(),
                question.getId()), createMultipleChoiceAnswerData(option));
        assertThat(result.status()).isEqualTo(200);
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
    public void testAnswerMultiChoiceQuestionWrongIP() throws Exception {
        // Setup
        Result result = request(Helpers.POST, "/app/student/exam/" + exam.getHash(), null);
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);
        ExamSectionQuestion question = Ebean.find(ExamSectionQuestion.class).where()
                .eq("examSection.exam", studentExam)
                .eq("question.type", Question.Type.MultipleChoiceQuestion)
                .findList()
                .get(0);
        Iterator<ExamSectionQuestionOption> it = question.getOptions().iterator();
        ExamSectionQuestionOption option = it.next();
        // Change IP of reservation machine to simulate that student is on different machine now
        machine.setIpAddress("127.0.0.2");
        machine.update();

        // Execute
        result = request(Helpers.POST, String.format("/app/student/exams/%s/question/%d/option", studentExam.getHash(),
                question.getId()), createMultipleChoiceAnswerData(option));
        assertThat(result.status()).isEqualTo(403);
    }


    @Test
    @RunAsStudent
    public void testDoExamAndAutoEvaluate() throws Exception {
        setAutoEvaluationConfig();
        Result result = request(Helpers.POST, "/app/student/exam/" + exam.getHash(), null);
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);
        for (ExamSection es : studentExam.getExamSections()) {
            for (ExamSectionQuestion esq : es.getSectionQuestions()) {
                Question question = esq.getQuestion();
                switch (question.getType()) {
                    case EssayQuestion:
                        ObjectNode body = Json.newObject().put("answer", "this is my answer");
                        EssayAnswer answer = esq.getEssayAnswer();
                        if (answer != null && answer.getObjectVersion() > 0) {
                            body.put("objectVersion", answer.getObjectVersion());
                        }
                        result = request(Helpers.POST, String.format("/app/student/exams/%s/question/%d",
                                studentExam.getHash(), question.getId()), body);
                        assertThat(result.status()).isEqualTo(200);
                        break;
                    default:
                        ExamSectionQuestion sectionQuestion = Ebean.find(ExamSectionQuestion.class).where()
                                .eq("examSection.exam", studentExam)
                                .eq("question.type", Question.Type.MultipleChoiceQuestion)
                                .findList()
                                .get(0);
                        Iterator<ExamSectionQuestionOption> it = sectionQuestion.getOptions().iterator();
                        ExamSectionQuestionOption option = it.next();
                        result = request(Helpers.POST, String.format("/app/student/exams/%s/question/%d/option", studentExam.getHash(),
                                question.getId()), createMultipleChoiceAnswerData(option));
                        assertThat(result.status()).isEqualTo(200);
                        break;
                }
            }
        }
        result = request(Helpers.PUT, String.format("/app/student/exams/%s", studentExam.getHash()), null);
        assertThat(result.status()).isEqualTo(200);
        studentExam = Ebean.find(Exam.class, studentExam.getId());
        assertThat(studentExam.getGrade()).isNotNull();
        assertThat(studentExam.getState()).isEqualTo(Exam.State.GRADED);
    }

    private Exam createPrivateStudentExam() {
        exam.setExecutionType(Ebean.find(ExamExecutionType.class)
                .where().eq("type", ExamExecutionType.Type.PRIVATE.toString())
                .findUnique());
        exam.update();
        Result result = request(Helpers.POST, "/app/student/exam/" + exam.getHash(), null);
        JsonNode node = Json.parse(contentAsString(result));
        return deserialize(Exam.class, node);
    }

    @Test
    @RunAsStudent
    public void testDoPrivateExam() throws Exception {
        Exam studentExam = createPrivateStudentExam();
        Result result = request(Helpers.PUT, String.format("/app/student/exams/%s", studentExam.getHash()), null);
        assertThat(result.status()).isEqualTo(200);

        // Check that correct mail was sent
        assertThat(greenMail.waitForIncomingEmail(1)).isTrue();
        MimeMessage[] mails = greenMail.getReceivedMessages();
        assertThat(mails).hasSize(1);
        assertThat(mails[0].getFrom()[0].toString()).contains(ConfigFactory.load().getString("sitnet.email.system.account"));
        assertThat(mails[0].getSubject()).isEqualTo("Personal exam has been returned");
        String body = GreenMailUtil.getBody(mails[0]);
        String reviewLink = String.format("%s/exams/review/%d",
                ConfigFactory.load().getString("sitnet.application.hostname"), studentExam.getId());
        String reviewLinkElement = String.format("<a href=\"%s\">%s</a>", reviewLink, "Link to evaluation");
        assertThat(body).contains(reviewLinkElement);
    }

    @Test
    @RunAsStudent
    public void testAbortPrivateExam() throws Exception {
        Exam studentExam = createPrivateStudentExam();
        Result result = request(Helpers.PUT, String.format("/app/student/exam/abort/%s", studentExam.getHash()), null);
        assertThat(result.status()).isEqualTo(200);

        // Check that correct mail was sent
        assertThat(greenMail.waitForIncomingEmail(1)).isTrue();
        MimeMessage[] mails = greenMail.getReceivedMessages();
        assertThat(mails).hasSize(1);
        assertThat(mails[0].getFrom()[0].toString()).contains(ConfigFactory.load().getString("sitnet.email.system.account"));
        assertThat(mails[0].getSubject()).isEqualTo("Personal exam has been abandoned");
        String body = GreenMailUtil.getBody(mails[0]);
        // Make sure there is no link to review
        assertThat(body).doesNotContain("<a href");
    }


    @Test
    @RunAsStudent
    public void testCreateStudentExamWrongIP() throws Exception {
        // Setup
        machine.setIpAddress("127.0.0.2");
        machine.update();

        // Execute
        Result result = request(Helpers.POST, "/app/student/exam/" + exam.getHash(), null);
        assertThat(result.status()).isEqualTo(403);

        // Verify that no student exam was created
        assertThat(Ebean.find(Exam.class).where().eq("parent.id", exam.getId()).findList()).hasSize(0);
    }

    @Test
    @RunAsStudent
    public void testCreateSeveralStudentExamsFails() throws Exception {
        // Execute
        Result result = request(Helpers.POST, "/app/student/exam/" + exam.getHash(), null);
        assertThat(result.status()).isEqualTo(200);

        // Try again
        result = request(Helpers.POST, "/app/student/exam/" + exam.getHash(), null);
        assertThat(result.status()).isEqualTo(403);

        // Verify that no student exam was created
        assertThat(Ebean.find(Exam.class).where().eq("parent.id", exam.getId()).findList()).hasSize(1);
    }

    @Test
    @RunAsStudent
    public void testCreateStudentExamAlreadyStarted() throws Exception {
        // Execute
        Result result = request(Helpers.POST, "/app/student/exam/" + exam.getHash(), null);
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);

        // Try again
        result = request(Helpers.POST, "/app/student/exam/" + studentExam.getHash(), null);
        assertThat(result.status()).isEqualTo(200);

        node = Json.parse(contentAsString(result));
        Exam anotherStudentExam = deserialize(Exam.class, node);

        // Verify that the previous exam was returned, and participation & enrolment still point to it
        assertThat(studentExam.getId()).isEqualTo(anotherStudentExam.getId());
        assertThat(Ebean.find(ExamEnrolment.class, enrolment.getId()).getExam().getHash()).isEqualTo(studentExam.getHash());
        ExamParticipation participation = Ebean.find(ExamParticipation.class).where().eq("exam.id", studentExam.getId()).findUnique();
        assertThat(participation.getStarted()).isNotNull();
        assertThat(participation.getUser().getId()).isEqualTo(user.getId());
    }

}
