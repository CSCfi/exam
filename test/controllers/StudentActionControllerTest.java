package controllers;

import base.IntegrationTestCase;
import base.RunAsStudent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import io.ebean.Ebean;
import models.Exam;
import models.ExamEnrolment;
import models.ExamMachine;
import models.ExamRoom;
import models.Reservation;
import models.User;
import models.iop.ExternalReservation;
import static org.fest.assertions.Assertions.assertThat;
import org.joda.time.DateTime;
import org.junit.Before;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import static play.test.Helpers.contentAsString;

import java.util.Locale;
import java.util.TimeZone;
import java.util.stream.StreamSupport;

public class StudentActionControllerTest extends IntegrationTestCase {

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();
        Ebean.deleteAll(Ebean.find(ExamEnrolment.class).findList());
    }

    @Test
    @RunAsStudent
    public void testGetEnrolmentsForUserWithExternalReservation() throws Exception {
        createEnrolment(1L);
        ExamEnrolment enrolment = createEnrolment(2L);
        final Reservation reservation = enrolment.getReservation();
        reservation.setMachine(null);
        reservation.setExternalReservation(createExternalReservation());
        reservation.save();

        // Execute
        Result result = get("/app/enrolments");
        assertThat(result.status()).isEqualTo(200);

        // Verify
        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node instanceof ArrayNode).isTrue();
        ArrayNode nodes = (ArrayNode) node;
        assertThat(nodes.size()).isEqualTo(2);
        JsonNode external = StreamSupport.stream(nodes.spliterator(), false)
                .filter(n -> n.path("exam").path("id").asLong() == 2L)
                .findFirst()
                .orElseGet(null);
        final ExamEnrolment externalEnrolment = deserialize(ExamEnrolment.class, external);
        final ExternalReservation er = externalEnrolment.getReservation().getExternalReservation();
        assertThat(er).isNotNull();
        assertThat(er.getRoomName()).isEqualTo("External Room");
        assertThat(er.getMachineName()).isEqualTo("External machine");
        assertThat(er.getOrgRef()).isEqualTo("org1234");
        assertThat(er.getRoomRef()).isEqualTo("room1234");
        assertThat(er.getRoomInstruction()).isEqualTo("Room instruction");
        assertThat(er.getRoomInstructionEN()).isEqualTo("Room instruction EN");
        assertThat(er.getRoomInstructionSV()).isEqualTo("Room instruction SV");
    }

    private ExamEnrolment createEnrolment(long examId) {
        Exam exam = Ebean.find(Exam.class).where().idEq(examId).findUnique();
        exam.setExamActiveEndDate(DateTime.now().plusYears(1));
        exam.setState(Exam.State.PUBLISHED);
        exam.save();

        User user = Ebean.find(User.class, userId);
        ExamRoom room = Ebean.find(ExamRoom.class, 1L);
        ExamMachine machine = room.getExamMachines().get(0);
        machine.setIpAddress("127.0.0.1"); // so that the IP check won't fail
        machine.update();
        Reservation reservation = new Reservation();
        reservation.setMachine(machine);
        reservation.setUser(user);
        reservation.setStartAt(DateTime.now().minusMinutes(10));
        reservation.setEndAt(DateTime.now().plusMinutes(70));
        reservation.save();
        ExamEnrolment enrolment = new ExamEnrolment();
        enrolment.setExam(exam);
        enrolment.setUser(user);
        enrolment.setReservation(reservation);
        enrolment.save();
        return enrolment;
    }

    private ExternalReservation createExternalReservation() {
        ExternalReservation externalReservation = new ExternalReservation();
        externalReservation.setRoomInstruction("Room instruction");
        externalReservation.setRoomInstructionEN("Room instruction EN");
        externalReservation.setRoomInstructionSV("Room instruction SV");
        externalReservation.setMachineName("External machine");
        externalReservation.setRoomRef("room1234");
        externalReservation.setOrgRef("org1234");
        externalReservation.setRoomName("External Room");
        externalReservation.setRoomTz(TimeZone.getTimeZone("Europe/Helsinki").getID());
        externalReservation.save();
        return externalReservation;
    }
}
