package controllers.iop;

import base.IntegrationTestCase;
import com.avaje.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.icegreen.greenmail.junit.GreenMailRule;
import com.icegreen.greenmail.util.ServerSetup;
import models.Exam;
import models.ExamEnrolment;
import models.ExamRoom;
import models.Language;
import models.Reservation;
import models.User;
import models.iop.ExternalReservation;
import org.joda.time.DateTime;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

import java.io.File;

import static org.fest.assertions.Assertions.assertThat;

public class ExternalExamControllerTest extends IntegrationTestCase {

    private static final String RESERVATION_REF = "0e6d16c51f857a20ab578f57f105032e";
    private static final String ROOM_REF = "0e6d16c51f857a20ab578f57f1018456";
    private static final String HASH = "7cf002da-4263-4843-99b1-e8af51e"; // Has to match with the externalRef in test json file

    private Exam exam;
    private ExamEnrolment enrolment;

    @Rule
    public final GreenMailRule greenMail = new GreenMailRule(new ServerSetup(11465, null, ServerSetup.PROTOCOL_SMTP));

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
        ObjectMapper om  = new ObjectMapper();
        JsonNode  node = om.readTree(new File("test/resources/externalExamAttainment.json"));
        Result result = request(Helpers.POST, "/integration/iop/exams/" + RESERVATION_REF, node);
        assertThat(result.status()).isEqualTo(201);

        Exam attainment = Ebean.find(Exam.class).where().eq("parent", exam).findUnique();
        assertThat(attainment).isNotNull();
        // Auto-evaluation expected to occur so state should be GRADED
        assertThat(attainment.getState()).isEqualTo(Exam.State.GRADED);
    }

    @Test
    public void testReceiveNoShow() throws Exception {
        Reservation reservation = new Reservation();
        reservation.setExternalRef(RESERVATION_REF);
        reservation.setStartAt(DateTime.now().minusHours(3));
        reservation.setEndAt(DateTime.now().minusHours(2));
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

        Result result = request(Helpers.POST, "/integration/iop/reservations/" + RESERVATION_REF + "/noshow",
                Json.newObject());
        assertThat(result.status()).isEqualTo(200);

        Reservation r = Ebean.find(Reservation.class).where().eq("externalRef", RESERVATION_REF).findUnique();
        assertThat(r).isNotNull();
        assertThat(r.isNoShow()).isTrue();
    }

}
