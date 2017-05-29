package controllers.iop;

import base.IntegrationTestCase;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import models.Exam;
import models.ExamEnrolment;
import models.ExamRoom;
import models.Language;
import models.Reservation;
import models.User;
import models.json.ExternalExam;
import org.joda.time.DateTime;
import org.junit.Before;
import org.junit.Test;
import play.mvc.Result;
import play.test.Helpers;

import java.io.File;

import static org.fest.assertions.Assertions.assertThat;

public class ExternalExamControllerTest extends IntegrationTestCase {

    private static final String RESERVATION_REF = "0e6d16c51f857a20ab578f57f105032e";
    private static final String ROOM_REF = "0e6d16c51f857a20ab578f57f1018456";
    private static final String HASH = "7cf002da-4263-4843-99b1-e8af51e"; // Has to match with the one in the test json file

    private ExternalExam ee;
    private Exam exam;
    private User user;

    private ExamRoom room;
    private ExamEnrolment enrolment;

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
        user = Ebean.find(User.class, 1L);
        user.setLanguage(Ebean.find(Language.class, "en"));
        user.update();
        room = Ebean.find(ExamRoom.class, 1L);
        room.setExternalRef(ROOM_REF);
        room.getExamMachines().get(0).setIpAddress("127.0.0.1");
        room.getExamMachines().get(0).update();
        room.update();

        enrolment = new ExamEnrolment();
        enrolment.setExam(exam);
        enrolment.setUser(user);
        enrolment.save();
    }

    @Test
    public void testReceiveExamAttainment() throws Exception {
        Reservation reservation = new Reservation();
        reservation.setExternalRef(RESERVATION_REF);
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();

        enrolment.setReservation(reservation);
        enrolment.update();
        ObjectMapper om  = new ObjectMapper();
        JsonNode  node = om.readTree(new File("test/resources/externalExamAttainment.json"));
        Result result = request(Helpers.POST, "/app/iop/exams/" + RESERVATION_REF, node);
        assertThat(result.status()).isEqualTo(201);

        Exam attainment = Ebean.find(Exam.class).where().eq("parent", exam).findUnique();
        assertThat(attainment).isNotNull();
        // Auto-evaluation expected to occur so state should be GRADED
        assertThat(attainment.getState()).isEqualTo(Exam.State.GRADED);
    }

}
