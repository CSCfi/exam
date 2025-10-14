// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import base.IntegrationTestCase;
import base.RunAsStudent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.icegreen.greenmail.configuration.GreenMailConfiguration;
import com.icegreen.greenmail.junit4.GreenMailRule;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetupTest;
import io.ebean.DB;
import jakarta.mail.internet.MimeMessage;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import models.assessment.AutoEvaluationConfig;
import models.assessment.GradeEvaluation;
import models.enrolment.ExamEnrolment;
import models.enrolment.ExamParticipation;
import models.enrolment.Reservation;
import models.exam.Exam;
import models.exam.ExamExecutionType;
import models.facility.ExamMachine;
import models.facility.ExamRoom;
import models.questions.ClozeTestAnswer;
import models.questions.EssayAnswer;
import models.questions.MultipleChoiceOption.ClaimChoiceOptionType;
import models.questions.Question;
import models.sections.ExamSectionQuestion;
import models.sections.ExamSectionQuestionOption;
import models.user.User;
import org.joda.time.DateTime;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

public class ExaminationControllerTest extends IntegrationTestCase {

    private Exam exam;
    private User user;

    private final ExamEnrolment enrolment = new ExamEnrolment();
    private ExamMachine machine;
    private final Reservation reservation = new Reservation();

    @Rule
    public final GreenMailRule greenMail = new GreenMailRule(ServerSetupTest.SMTP).withConfiguration(
        new GreenMailConfiguration().withDisabledAuthentication()
    );

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();
        DB.deleteAll(DB.find(ExamEnrolment.class).findList());
        exam = DB.find(Exam.class)
            .fetch("examSections")
            .fetch("examSections.sectionQuestions")
            .where()
            .idEq(1L)
            .findOne();
        initExamSectionQuestions(exam);

        user = DB.find(User.class, userId);
        ExamRoom room = DB.find(ExamRoom.class, 1L);
        machine = room.getExamMachines().getFirst();
        machine.setIpAddress("127.0.0.1"); // so that the IP check won't fail
        machine.update();
        reservation.setMachine(machine);
        reservation.setUser(user);
        reservation.setStartAt(DateTime.now().minusMinutes(10));
        reservation.setEndAt(DateTime.now().plusMinutes(70));
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
        exam
            .getGradeScale()
            .getGrades()
            .forEach(g -> {
                GradeEvaluation ge = new GradeEvaluation();
                ge.setGrade(g);
                ge.setPercentage(20 * Integer.parseInt(g.getName()));
                config.getGradeEvaluations().add(ge);
            });
        config.setExam(exam);
        config.save();
    }

    private Exam prepareExamination() {
        Result result1 = get("/app/student/exam/" + exam.getHash());
        assertThat(result1.status()).isEqualTo(Helpers.OK);
        JsonNode node1 = Json.parse(contentAsString(result1));
        assertThat(node1.get("cloned").asBoolean());
        String hash = deserialize(Exam.class, node1).getHash();
        // ROUND 2 with updated hash
        Result result2 = get("/app/student/exam/" + hash);
        JsonNode node2 = Json.parse(contentAsString(result2));
        return deserialize(Exam.class, node2);
    }

    @Test
    @RunAsStudent
    public void testCreateStudentExam() {
        // Execute
        Exam studentExam = prepareExamination();
        assertThat(studentExam.getName()).isEqualTo(exam.getName());
        assertThat(studentExam.getCourse().getId()).isEqualTo(exam.getCourse().getId());
        assertThat(studentExam.getInstruction()).isEqualTo(exam.getInstruction());
        int esSize = (int) exam
            .getExamSections()
            .stream()
            .filter(es -> !es.isOptional())
            .count();
        assertThat(studentExam.getExamSections()).hasSize(esSize);
        assertThat(studentExam.getHash()).isNotEqualTo(exam.getHash());
        assertThat(studentExam.getExamLanguages()).hasSize(exam.getExamLanguages().size());

        assertThat(studentExam.getDuration()).isEqualTo(exam.getDuration());

        assertThat(DB.find(Exam.class).where().eq("hash", studentExam.getHash()).findOne()).isNotNull();
        assertThat(DB.find(ExamEnrolment.class, enrolment.getId()).getExam().getHash()).isEqualTo(
            studentExam.getHash()
        );

        ExamParticipation participation = DB.find(ExamParticipation.class)
            .where()
            .eq("exam.id", studentExam.getId())
            .findOne();
        assertThat(participation.getStarted()).isNotNull();
        assertThat(participation.getUser().getId()).isEqualTo(user.getId());
    }

    @Test
    @RunAsStudent
    public void testAnswerMultiChoiceQuestion() {
        Exam studentExam = prepareExamination();
        ExamSectionQuestion question = DB.find(ExamSectionQuestion.class)
            .where()
            .eq("examSection.exam", studentExam)
            .eq("question.type", Question.Type.MultipleChoiceQuestion)
            .findList()
            .getFirst();
        List<ExamSectionQuestionOption> options = question.getOptions();
        Result result = request(
            Helpers.POST,
            String.format("/app/student/exam/%s/question/%d/option", studentExam.getHash(), question.getId()),
            createMultipleChoiceAnswerData(options.getFirst())
        );
        assertThat(result.status()).isEqualTo(Helpers.OK);

        // Change answer
        result = request(
            Helpers.POST,
            String.format("/app/student/exam/%s/question/%d/option", studentExam.getHash(), question.getId()),
            createMultipleChoiceAnswerData(options.getLast())
        );
        assertThat(result.status()).isEqualTo(Helpers.OK);
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
    public void testAnswerMultiChoiceQuestionWrongIP() {
        // Setup
        Exam studentExam = prepareExamination();
        ExamSectionQuestion question = DB.find(ExamSectionQuestion.class)
            .where()
            .eq("examSection.exam", studentExam)
            .eq("question.type", Question.Type.MultipleChoiceQuestion)
            .findList()
            .getFirst();
        List<ExamSectionQuestionOption> options = question.getOptions();
        // Change IP of reservation machine to simulate that student is on different machine now
        machine.setIpAddress("127.0.0.2");
        machine.update();

        // Execute
        Result result = request(
            Helpers.POST,
            String.format("/app/student/exam/%s/question/%d/option", studentExam.getHash(), question.getId()),
            createMultipleChoiceAnswerData(options.getFirst())
        );
        assertThat(result.status()).isEqualTo(Helpers.FORBIDDEN);
    }

    @Test
    @RunAsStudent
    public void testAnswerClozeTestQuestionInvalidJson() {
        Exam studentExam = prepareExamination();
        ExamSectionQuestion question = DB.find(ExamSectionQuestion.class)
            .where()
            .eq("examSection.exam", studentExam)
            .eq("question.type", Question.Type.ClozeTestQuestion)
            .findList()
            .getFirst();
        String answer = "{\"foo\": \"bar";
        Result result = request(
            Helpers.POST,
            String.format("/app/student/exam/%s/clozetest/%d", studentExam.getHash(), question.getId()),
            Json.newObject().put("answer", answer).put("objectVersion", 1L)
        );
        assertThat(result.status()).isEqualTo(Helpers.BAD_REQUEST);
    }

    @Test
    @RunAsStudent
    public void testDoExamAndAutoEvaluate() {
        setAutoEvaluationConfig();
        Exam studentExam = prepareExamination();
        studentExam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .forEach(esq -> {
                Question question = esq.getQuestion();
                Result r;
                switch (question.getType()) {
                    case EssayQuestion:
                        ObjectNode body = Json.newObject().put("answer", "this is my answer");
                        EssayAnswer answer = esq.getEssayAnswer();
                        if (answer != null && answer.getObjectVersion() > 0) {
                            body.put("objectVersion", answer.getObjectVersion());
                        }
                        r = request(
                            Helpers.POST,
                            String.format("/app/student/exam/%s/question/%d", studentExam.getHash(), esq.getId()),
                            body
                        );
                        assertThat(r.status()).isEqualTo(Helpers.OK);
                        break;
                    case ClozeTestQuestion:
                        ObjectNode content = Json.newObject().set(
                            "answer",
                            Json.newObject()
                                .put("1", "this is my answer for cloze 1")
                                .put("2", "this is my answer for cloze 2")
                        );
                        ClozeTestAnswer clozeAnswer = esq.getClozeTestAnswer();
                        if (clozeAnswer != null && clozeAnswer.getObjectVersion() > 0) {
                            content.put("objectVersion", clozeAnswer.getObjectVersion());
                        }
                        r = request(
                            Helpers.POST,
                            String.format("/app/student/exam/%s/clozetest/%d", studentExam.getHash(), esq.getId()),
                            content
                        );
                        assertThat(r.status()).isEqualTo(Helpers.OK);
                        break;
                    default:
                        ExamSectionQuestion sectionQuestion = DB.find(ExamSectionQuestion.class)
                            .where()
                            .eq("examSection.exam", studentExam)
                            .eq("question.type", Question.Type.MultipleChoiceQuestion)
                            .findList()
                            .getFirst();
                        List<ExamSectionQuestionOption> options = sectionQuestion.getOptions();
                        r = request(
                            Helpers.POST,
                            String.format(
                                "/app/student/exam/%s/question/%d/option",
                                studentExam.getHash(),
                                esq.getId()
                            ),
                            createMultipleChoiceAnswerData(options.getFirst())
                        );
                        assertThat(r.status()).isEqualTo(Helpers.OK);
                        break;
                }
            });
        Result result = request(Helpers.PUT, String.format("/app/student/exam/%s", studentExam.getHash()), null);
        assertThat(result.status()).isEqualTo(Helpers.OK);
        Exam turnedExam = DB.find(Exam.class, studentExam.getId());
        assertThat(turnedExam.getGrade()).isNotNull();
        assertThat(turnedExam.getState()).isEqualTo(Exam.State.GRADED);

        greenMail.waitForIncomingEmail(20000, 1);
    }

    private Exam createPrivateStudentExam() {
        exam.setExecutionType(
            DB.find(ExamExecutionType.class).where().eq("type", ExamExecutionType.Type.PRIVATE.toString()).findOne()
        );
        exam.update();
        // Execute
        return prepareExamination();
    }

    @Test
    @RunAsStudent
    public void testDoPrivateExam() throws Exception {
        Exam studentExam = createPrivateStudentExam();
        Result result = request(Helpers.PUT, String.format("/app/student/exam/%s", studentExam.getHash()), null);
        assertThat(result.status()).isEqualTo(Helpers.OK);

        // Check that correct mail was sent
        assertThat(greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1)).isTrue();
        MimeMessage[] mails = greenMail.getReceivedMessages();
        assertThat(mails).hasSize(1);
        assertThat(mails[0].getFrom()[0].toString()).contains("no-reply@exam.org");
        assertThat(mails[0].getSubject()).isEqualTo("Personal exam has been returned");
        String body = GreenMailUtil.getBody(mails[0]);
        String reviewLink = String.format("%s/staff/assessments/%d", "http://uni.org", studentExam.getId());
        String reviewLinkElement = String.format("<a href=\"%s\">%s</a>", reviewLink, "Link to evaluation");
        assertThat(body).contains(reviewLinkElement);
    }

    @Test
    @RunAsStudent
    public void testAbortPrivateExam() throws Exception {
        Exam studentExam = createPrivateStudentExam();
        Result result = request(Helpers.PUT, String.format("/app/student/exam/abort/%s", studentExam.getHash()), null);
        assertThat(result.status()).isEqualTo(Helpers.OK);

        // Check that correct mail was sent
        assertThat(greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1)).isTrue();
        MimeMessage[] mails = greenMail.getReceivedMessages();
        assertThat(mails).hasSize(1);
        assertThat(mails[0].getFrom()[0].toString()).contains("no-reply@exam.org");
        assertThat(mails[0].getSubject()).isEqualTo("Personal exam has been abandoned");
        String body = GreenMailUtil.getBody(mails[0]);
        // Make sure there is no link to review
        assertThat(body).doesNotContain("<a href");
    }

    @Test
    @RunAsStudent
    public void testCreateStudentExamWrongIP() {
        // Setup
        machine.setIpAddress("127.0.0.2");
        machine.update();

        // Execute
        Result result = get("/app/student/exam/" + exam.getHash());
        assertThat(result.status()).isEqualTo(Helpers.FORBIDDEN);

        // Verify that no student exam was created
        assertThat(DB.find(Exam.class).where().eq("parent.id", exam.getId()).findList()).hasSize(0);
    }

    @Test
    @RunAsStudent
    public void testCreateSeveralStudentExamsFails() {
        // Execute
        Result result = get("/app/student/exam/" + exam.getHash());
        assertThat(result.status()).isEqualTo(Helpers.OK);

        // Try again
        result = get("/app/student/exam/" + exam.getHash());
        assertThat(result.status()).isEqualTo(Helpers.FORBIDDEN);

        // Verify that no student exam was created
        assertThat(DB.find(Exam.class).where().eq("parent.id", exam.getId()).findList()).hasSize(1);
    }

    @Test
    @RunAsStudent
    public void testCreateStudentExamAlreadyStarted() {
        // Execute
        Result result = get("/app/student/exam/" + exam.getHash());
        assertThat(result.status()).isEqualTo(Helpers.OK);
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);

        // Try again
        result = get("/app/student/exam/" + studentExam.getHash());
        assertThat(result.status()).isEqualTo(Helpers.OK);

        node = Json.parse(contentAsString(result));
        Exam anotherStudentExam = deserialize(Exam.class, node);

        // Verify that the previous exam was returned, and participation and enrolment still point to it
        assertThat(studentExam.getId()).isEqualTo(anotherStudentExam.getId());
        assertThat(DB.find(ExamEnrolment.class, enrolment.getId()).getExam().getHash()).isEqualTo(
            studentExam.getHash()
        );
        ExamParticipation participation = DB.find(ExamParticipation.class)
            .where()
            .eq("exam.id", studentExam.getId())
            .findOne();
        assertThat(participation.getStarted()).isNotNull();
        assertThat(participation.getUser().getId()).isEqualTo(user.getId());
    }

    @Test
    @RunAsStudent
    public void testClaimChoiceQuestionOptionOrderAndAnswerSkip() {
        Exam studentExam = prepareExamination();
        ExamSectionQuestion question = DB.find(ExamSectionQuestion.class)
            .where()
            .eq("examSection.exam", studentExam)
            .eq("question.type", Question.Type.ClaimChoiceQuestion)
            .findList()
            .getFirst();
        List<ExamSectionQuestionOption> options = new ArrayList<>(question.getOptions());

        // Check that option order is the same as in original question, although scores have been changed for exam options
        assertThat(options.get(0).getScore()).isEqualTo(-1);
        assertThat(options.get(0).getOption().getClaimChoiceType()).isEqualTo(ClaimChoiceOptionType.CorrectOption);
        assertThat(options.get(1).getScore()).isEqualTo(1);
        assertThat(options.get(1).getOption().getClaimChoiceType()).isEqualTo(ClaimChoiceOptionType.IncorrectOption);
        assertThat(options.get(2).getOption().getClaimChoiceType()).isEqualTo(ClaimChoiceOptionType.SkipOption);

        Result result = request(
            Helpers.POST,
            String.format("/app/student/exam/%s/question/%d/option", studentExam.getHash(), question.getId()),
            createMultipleChoiceAnswerData(options.get(2))
        );
        assertThat(result.status()).isEqualTo(Helpers.OK);
    }
}
