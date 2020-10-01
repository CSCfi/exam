package controllers;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamExecutionType;
import backend.models.ExamRoom;
import backend.models.Language;
import backend.models.Reservation;
import backend.models.User;
import backend.models.calendar.DefaultWorkingHours;
import base.IntegrationTestCase;
import base.RunAsStudent;
import com.icegreen.greenmail.junit.GreenMailRule;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetup;
import com.typesafe.config.ConfigFactory;
import io.ebean.Ebean;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import javax.mail.internet.MimeMessage;
import net.jodah.concurrentunit.Waiter;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

public class CalendarControllerTest extends IntegrationTestCase {
    private Exam exam;
    private User user;

    private ExamEnrolment enrolment;
    private ExamRoom room;
    private Reservation reservation;

    @Rule
    public final GreenMailRule greenMail = new GreenMailRule(new ServerSetup(11465, null, ServerSetup.PROTOCOL_SMTP));

    private void setWorkingHours() {
        String[] dates = { "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY" };
        int d = DateTime.now().getDayOfWeek() - 1;
        String weekday = dates[d];
        DefaultWorkingHours dwh = new DefaultWorkingHours();
        dwh.setWeekday(weekday);
        dwh.setRoom(room);
        dwh.setStartTime(DateTime.now().withTimeAtStartOfDay());
        dwh.setEndTime(DateTime.now().withTime(23, 59, 59, 999));
        dwh.save();
    }

    @Override
    @Before
    public void setUp() throws Exception {
        super.setUp();
        Ebean.deleteAll(Ebean.find(ExamEnrolment.class).findList());
        exam = Ebean.find(Exam.class).where().eq("state", Exam.State.PUBLISHED).findList().get(0);
        user = Ebean.find(User.class, userId);
        user.setLanguage(Ebean.find(Language.class, "en"));
        user.update();
        room = Ebean.find(ExamRoom.class, 1L);
        room.setRoomInstructionEN("information in English here");
        room.update();
        setWorkingHours();
        enrolment = new ExamEnrolment();
        enrolment.setExam(exam);
        enrolment.setUser(user);
        enrolment.save();

        reservation = new Reservation();
        reservation.setUser(user);
    }

    @Test
    @RunAsStudent
    public void testConcurentCreateReservation() throws Exception {
        exam.setExecutionType(Ebean.find(ExamExecutionType.class, 2));
        exam.getExamOwners().add(Ebean.find(User.class, 4));
        exam.save();
        DateTime start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2);
        DateTime end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(3);

        final int callCount = 10;
        final Waiter waiter = new Waiter();
        List<Integer> status = new ArrayList<>();
        IntStream
            .range(0, callCount)
            .parallel()
            .forEach(
                i ->
                    new Thread(
                        () -> {
                            final Result result = request(
                                Helpers.POST,
                                "/app/calendar/reservation",
                                Json
                                    .newObject()
                                    .put("roomId", room.getId())
                                    .put("examId", exam.getId())
                                    .put("start", ISODateTimeFormat.dateTime().print(start))
                                    .put("end", ISODateTimeFormat.dateTime().print(end))
                            );
                            status.add(result.status());
                            waiter.resume();
                        }
                    )
                        .start()
            );
        waiter.await(MAIL_TIMEOUT + 1000, callCount);
        assertThat(status).containsOnly(200);
        greenMail.purgeEmailFromAllMailboxes();
        assertThat(greenMail.waitForIncomingEmail(MAIL_TIMEOUT, callCount)).isTrue();
        final int count = Ebean.find(Reservation.class).where().eq("user.id", 3L).findCount();
        assertThat(count).isEqualTo(1);
    }

    @Test
    @RunAsStudent
    public void testCreateReservation() throws Exception {
        // Setup
        // Private exam
        exam.setExecutionType(Ebean.find(ExamExecutionType.class, 2));
        exam.getExamOwners().add(Ebean.find(User.class, 4));
        exam.save();
        DateTime start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1);
        DateTime end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2);

        // Execute
        Result result = request(
            Helpers.POST,
            "/app/calendar/reservation",
            Json
                .newObject()
                .put("roomId", room.getId())
                .put("examId", exam.getId())
                .put("start", ISODateTimeFormat.dateTime().print(start))
                .put("end", ISODateTimeFormat.dateTime().print(end))
        );
        assertThat(result.status()).isEqualTo(200);

        // Verify
        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation()).isNotNull();
        assertThat(ee.getReservation().getStartAt()).isEqualTo(start);
        assertThat(ee.getReservation().getEndAt()).isEqualTo(end);
        assertThat(ee.getExam().getId()).isEqualTo(exam.getId());
        assertThat(ee.getReservation().getMachine()).isIn(room.getExamMachines());
        greenMail.purgeEmailFromAllMailboxes();

        // Check that correct mail was sent
        assertThat(greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1)).isTrue();
        MimeMessage[] mails = greenMail.getReceivedMessages();
        assertThat(mails).hasSize(1);
        assertThat(mails[0].getFrom()[0].toString())
            .contains(ConfigFactory.load().getString("sitnet.email.system.account"));
        String body = GreenMailUtil.getBody(mails[0]);
        assertThat(body).contains("You have booked an exam time");
        assertThat(body).contains("information in English here");
        assertThat(body).contains(room.getName());
        assertThat(GreenMailUtil.hasNonTextAttachments(mails[0])).isTrue();
    }

    @Test
    @RunAsStudent
    public void testCreateReservationPreviousInFuture() throws Exception {
        // Setup
        DateTime start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1);
        DateTime end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2);

        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.update();

        // Execute
        Result result = request(
            Helpers.POST,
            "/app/calendar/reservation",
            Json
                .newObject()
                .put("roomId", room.getId())
                .put("examId", exam.getId())
                .put("start", ISODateTimeFormat.dateTime().print(start))
                .put("end", ISODateTimeFormat.dateTime().print(end))
        );
        assertThat(result.status()).isEqualTo(200);

        // Verify
        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation()).isNotNull();
        assertThat(ee.getReservation().getStartAt()).isEqualTo(start);
        assertThat(ee.getReservation().getEndAt()).isEqualTo(end);
        assertThat(ee.getExam().getId()).isEqualTo(exam.getId());
        assertThat(ee.getReservation().getMachine()).isIn(room.getExamMachines());

        // Check that correct mail was sent
        assertThat(greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1)).isTrue();
        MimeMessage[] mails = greenMail.getReceivedMessages();
        assertThat(mails).hasSize(1);
        assertThat(mails[0].getFrom()[0].toString())
            .contains(ConfigFactory.load().getString("sitnet.email.system.account"));
        String body = GreenMailUtil.getBody(mails[0]);
        assertThat(body).contains("You have booked an exam time");
        assertThat(body).contains("information in English here");
        assertThat(body).contains(room.getName());
        assertThat(GreenMailUtil.hasNonTextAttachments(mails[0])).isTrue();
    }

    @Test
    @RunAsStudent
    public void testCreateReservationPreviousInPast() throws Exception {
        // Setup
        DateTime start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1);
        DateTime end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2);

        reservation.setStartAt(DateTime.now().minusMinutes(30));
        reservation.setEndAt(DateTime.now().minusMinutes(5));
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.setNoShow(true);
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.update();

        ExamEnrolment newEnrolment = new ExamEnrolment();
        DateTime enrolledOn = DateTime.now();
        newEnrolment.setEnrolledOn(enrolledOn);
        newEnrolment.setExam(exam);
        newEnrolment.setUser(user);
        newEnrolment.save();

        // Execute
        Result result = request(
            Helpers.POST,
            "/app/calendar/reservation",
            Json
                .newObject()
                .put("roomId", room.getId())
                .put("examId", exam.getId())
                .put("start", ISODateTimeFormat.dateTime().print(start))
                .put("end", ISODateTimeFormat.dateTime().print(end))
        );
        assertThat(result.status()).isEqualTo(200);

        // Verify
        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, newEnrolment.getId());
        assertThat(ee.getReservation()).isNotNull();
        assertThat(ee.getReservation().getStartAt()).isEqualTo(start);
        assertThat(ee.getReservation().getEndAt()).isEqualTo(end);
        assertThat(ee.getExam().getId()).isEqualTo(exam.getId());
        assertThat(ee.getReservation().getMachine()).isIn(room.getExamMachines());

        // Check that correct mail was sent
        assertThat(greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1)).isTrue();
        MimeMessage[] mails = greenMail.getReceivedMessages();
        assertThat(mails).hasSize(1);
        assertThat(mails[0].getFrom()[0].toString())
            .contains(ConfigFactory.load().getString("sitnet.email.system.account"));
        String body = GreenMailUtil.getBody(mails[0]);
        assertThat(body).contains("You have booked an exam time");
        assertThat(body).contains("information in English here");
        assertThat(body).contains(room.getName());
        assertThat(GreenMailUtil.hasNonTextAttachments(mails[0])).isTrue();
    }

    @Test
    @RunAsStudent
    public void testCreateReservationStartIsPast() throws Exception {
        // Setup
        DateTime start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).minusHours(1);
        DateTime end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2);

        // Execute
        Result result = request(
            Helpers.POST,
            "/app/calendar/reservation",
            Json
                .newObject()
                .put("roomId", room.getId())
                .put("examId", exam.getId())
                .put("start", ISODateTimeFormat.dateTime().print(start))
                .put("end", ISODateTimeFormat.dateTime().print(end))
        );
        assertThat(result.status()).isEqualTo(400);

        // Verify
        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation()).isNull();
    }

    @Test
    @RunAsStudent
    public void testCreateReservationEndsBeforeStarts() throws Exception {
        // Setup
        DateTime start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2);
        DateTime end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1);

        // Execute
        Result result = request(
            Helpers.POST,
            "/app/calendar/reservation",
            Json
                .newObject()
                .put("roomId", room.getId())
                .put("examId", exam.getId())
                .put("start", ISODateTimeFormat.dateTime().print(start))
                .put("end", ISODateTimeFormat.dateTime().print(end))
        );
        assertThat(result.status()).isEqualTo(400);

        // Verify
        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation()).isNull();
    }

    @Test
    @RunAsStudent
    public void testCreateReservationPreviousInEffect() throws Exception {
        // Setup
        DateTime start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1);
        DateTime end = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2);

        reservation.setStartAt(DateTime.now().minusMinutes(10));
        reservation.setEndAt(DateTime.now().plusMinutes(10));
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.update();

        // Execute
        Result result = request(
            Helpers.POST,
            "/app/calendar/reservation",
            Json
                .newObject()
                .put("roomId", room.getId())
                .put("examId", exam.getId())
                .put("start", ISODateTimeFormat.dateTime().print(start))
                .put("end", ISODateTimeFormat.dateTime().print(end))
        );
        assertThat(result.status()).isEqualTo(403);
        assertThat(contentAsString(result).equals("sitnet_error_enrolment_not_found"));

        // Verify
        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation().getId()).isEqualTo(reservation.getId());
    }

    @Test
    @RunAsStudent
    public void testRemoveReservation() throws Exception {
        // Setup
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.setStartAt(DateTime.now().plusHours(2));
        reservation.setEndAt(DateTime.now().plusHours(3));
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.update();

        // Execute
        Result result = request(Helpers.DELETE, "/app/calendar/reservation/" + reservation.getId(), null);
        assertThat(result.status()).isEqualTo(200);
        assertThat(greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1)).isTrue();

        // Verify
        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation()).isNull();
        assertThat(Ebean.find(Reservation.class, reservation.getId())).isNull();
    }

    @Test
    @RunAsStudent
    public void testRemoveReservationInPast() throws Exception {
        // Setup
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.setStartAt(DateTime.now().minusHours(2));
        reservation.setEndAt(DateTime.now().minusHours(1));
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.update();

        // Execute
        Result result = request(Helpers.DELETE, "/app/calendar/reservation/" + reservation.getId(), null);
        assertThat(result.status()).isEqualTo(403);

        // Verify
        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation().getId()).isEqualTo(reservation.getId());
    }

    @Test
    @RunAsStudent
    public void testRemoveReservationInProgress() throws Exception {
        // Setup
        reservation.setMachine(room.getExamMachines().get(0));
        reservation.setStartAt(DateTime.now().minusHours(1));
        reservation.setEndAt(DateTime.now().plusHours(1));
        reservation.save();
        enrolment.setReservation(reservation);
        enrolment.update();

        // Execute
        Result result = request(Helpers.DELETE, "/app/calendar/reservation/" + reservation.getId(), null);
        assertThat(result.status()).isEqualTo(403);

        // Verify
        ExamEnrolment ee = Ebean.find(ExamEnrolment.class, enrolment.getId());
        assertThat(ee.getReservation().getId()).isEqualTo(reservation.getId());
    }
}
