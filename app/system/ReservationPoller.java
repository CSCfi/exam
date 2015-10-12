package system;

import com.avaje.ebean.Ebean;
import models.*;
import play.Logger;
import util.java.EmailComposer;

import javax.inject.Singleton;
import java.io.IOException;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Singleton
public class ReservationPoller implements Runnable {

    EmailComposer emailComposer;

    public ReservationPoller(EmailComposer composer) {
        emailComposer = composer;
    }

    @Override
    public void run() {
        Logger.info("Running no-show check ...");
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where()
                .eq("reservation.noShow", false)
                .lt("reservation.endAt", new Date())
                .eq("exam.state", Exam.State.PUBLISHED)
                .findList();

        if (enrolments.isEmpty()) {
            Logger.info(" -> none found.");
        } else {
            handleNoShows(enrolments, emailComposer);
        }
    }

    public static void handleNoShow(User user, Long examId, EmailComposer composer) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where()
                .eq("user", user)
                .eq("reservation.noShow", false)
                .lt("reservation.endAt", new Date())
                .eq("exam.id", examId)
                .eq("exam.state", Exam.State.PUBLISHED)
                .findList();
        handleNoShows(enrolments, composer);
    }

    public static void handleNoShow(ExamEnrolment enrolment, EmailComposer composer) {
        Reservation reservation = enrolment.getReservation();
        reservation.setNoShow(true);
        reservation.update();
        Exam exam = enrolment.getExam();
        if (exam.isPrivate()) {
            // Notify teachers
            Set<User> recipients = new HashSet<>();
            recipients.addAll(exam.getExamOwners());
            recipients.addAll(exam.getExamInspections().stream().map(
                    ExamInspection::getUser).collect(Collectors.toSet()));
            for (User r : recipients) {
                try {
                    composer.composeNoShowMessage(r, enrolment.getUser(), exam);
                    Logger.info("Email sent to {}", r.getEmail());
                } catch (IOException e) {
                    Logger.error("Failed to send email", e);
                }
            }
        }
    }

    public static void handleNoShows(List<ExamEnrolment> noShows, EmailComposer composer) {
        for (ExamEnrolment enrolment : noShows) {
            handleNoShow(enrolment, composer);
            Logger.info(" -> marked reservation {} as no-show", enrolment.getReservation().getId());
        }
    }

}
