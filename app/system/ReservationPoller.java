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
                .eq("exam.state", Exam.State.PUBLISHED.toString())
                .findList();

        if (enrolments.isEmpty()) {
            Logger.info(" -> none found.");
        } else {
            handleNoShows(enrolments);
        }
    }

    private void handleNoShows(List<ExamEnrolment> noShows) {
        for (ExamEnrolment enrolment : noShows) {
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
                        emailComposer.composeNoShowMessage(r, enrolment.getUser(), exam);
                        Logger.info("Email sent to {}", r.getEmail());
                    } catch (IOException e) {
                        Logger.error("Failed to send email", e);
                    }
                }
            }
            Logger.info(" -> marked reservation {} as no-show", reservation.getId());
        }
    }

}
