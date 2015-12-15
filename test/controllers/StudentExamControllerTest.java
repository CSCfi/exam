package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import models.*;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import org.joda.time.DateTime;
import org.junit.Before;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

public class StudentExamControllerTest extends IntegrationTestCase {

    private Exam exam;
    private User user;

    private ExamEnrolment enrolment = new ExamEnrolment();
    private ExamMachine machine;
    private Reservation reservation = new Reservation();

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();
        Ebean.delete(Ebean.find(ExamEnrolment.class).findList());
        exam = Ebean.find(Exam.class, 1);
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

    @Test
    @RunAsStudent
    public void testCreateStudentExam() throws Exception {
        // Execute
        Result result = get("/student/doexam/" + exam.getHash());
        assertThat(result.status()).isEqualTo(200);

        // Verify
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);
        assertThat(studentExam.getName()).isEqualTo(exam.getName());
        assertThat(studentExam.getCourse().getId()).isEqualTo(exam.getCourse().getId());
        assertThat(studentExam.getInstruction()).isEqualTo(exam.getInstruction());
        assertThat(studentExam.getExamSections()).hasSize(exam.getExamSections().size());
        assertThat(studentExam.getHash()).isNotEqualTo(exam.getHash());
        assertThat(studentExam.isCloned()).isTrue();
        assertThat(studentExam.getExamLanguages()).hasSize(exam.getExamLanguages().size());
        assertThat(studentExam.getExamActiveStartDate()).isEqualTo(exam.getExamActiveStartDate());
        assertThat(studentExam.getExamActiveEndDate()).isEqualTo(exam.getExamActiveEndDate());
        assertThat(studentExam.getDuration()).isEqualTo(exam.getDuration());
        assertThat(studentExam.getState()).isEqualTo(Exam.State.STUDENT_STARTED);
        assertThat(studentExam.getCreator().getId()).isEqualTo(user.getId());

        assertThat(Ebean.find(Exam.class).where().eq("hash", studentExam.getHash()).findUnique()).isNotNull();
        assertThat(Ebean.find(ExamEnrolment.class, enrolment.getId()).getExam().getHash()).isEqualTo(studentExam.getHash());

        ExamParticipation participation = Ebean.find(ExamParticipation.class).where().eq("exam.id", studentExam.getId()).findUnique();
        assertThat(participation.getStarted()).isNotNull();
        assertThat(participation.getUser().getId()).isEqualTo(user.getId());
    }

    @Test
    @RunAsStudent
    public void testAnswerMultiChoiceQuestion() throws Exception {
        Result result = get("/student/doexam/" + exam.getHash());
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);
        Question question = Ebean.find(Question.class).where()
                .eq("examSectionQuestion.examSection.exam", studentExam)
                .eq("type", Question.Type.MultipleChoiceQuestion)
                .findList()
                .get(0);
        MultipleChoiceOption option = question.getOptions().get(0);
        result = request(Helpers.POST, String.format("/student/exams/%s/question/%d/option/%d", studentExam.getHash(),
                question.getId(), option.getId()), null);
        assertThat(result.status()).isEqualTo(200);

        // Change answer
        option = question.getOptions().get(1);
        result = request(Helpers.POST, String.format("/student/exams/%s/question/%d/option/%d", studentExam.getHash(),
                question.getId(), option.getId()), null);
        assertThat(result.status()).isEqualTo(200);
    }

    @Test
    @RunAsStudent
    public void testAnswerMultiChoiceQuestionWrongIP() throws Exception {
        // Setup
        Result result = get("/student/doexam/" + exam.getHash());
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);
        Question question = Ebean.find(Question.class).where()
                .eq("examSectionQuestion.examSection.exam", studentExam)
                .eq("type", Question.Type.MultipleChoiceQuestion)
                .findList()
                .get(0);
        MultipleChoiceOption option = question.getOptions().get(0);
        // Change IP of reservation machine to simulate that student is on different machine now
        machine.setIpAddress("127.0.0.2");
        machine.update();

        // Execute
        result = request(Helpers.POST, String.format("/student/exams/%s/question/%d/option/%d", studentExam.getHash(),
                question.getId(), option.getId()), null);
        assertThat(result.status()).isEqualTo(403);
    }


    @Test
    @RunAsStudent
    public void testCreateStudentExamWrongIP() throws Exception {
        // Setup
        machine.setIpAddress("127.0.0.2");
        machine.update();

        // Execute
        Result result = get("/student/doexam/" + exam.getHash());
        assertThat(result.status()).isEqualTo(403);

        // Verify that no student exam was created
        assertThat(Ebean.find(Exam.class).where().eq("parent.id", exam.getId()).findList()).hasSize(0);
    }

    @Test
    @RunAsStudent
    public void testCreateSeveralStudentExamsFails() throws Exception {
        // Execute
        Result result = get("/student/doexam/" + exam.getHash());
        assertThat(result.status()).isEqualTo(200);

        // Try again
        result = get("/student/doexam/" + exam.getHash());
        assertThat(result.status()).isEqualTo(403);

        // Verify that no student exam was created
        assertThat(Ebean.find(Exam.class).where().eq("parent.id", exam.getId()).findList()).hasSize(1);
    }

    @Test
    @RunAsStudent
    public void testCreateStudentExamAlreadyStarted() throws Exception {
        // Execute
        Result result = get("/student/doexam/" + exam.getHash());
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        Exam studentExam = deserialize(Exam.class, node);

        // Try again
        result = get("/student/doexam/" + studentExam.getHash());
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
