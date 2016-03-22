package util.java;

import com.avaje.ebean.Ebean;
import models.*;
import play.Logger;

import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class NoShowHandlerUtil {

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
        handleNoShows(enrolments, composer, null);
    }

    public static void handleNoShows(List<ExamEnrolment> noShows, EmailComposer composer, Class<?> sender) {
        for (ExamEnrolment enrolment : noShows) {
            handleNoShow(enrolment, composer);
            if (sender != null) {
                Logger.info("{}: ... marked reservation {} as no-show", sender.getCanonicalName(),
                        enrolment.getReservation().getId());
            }
        }
    }

    private static void handleNoShow(ExamEnrolment enrolment, EmailComposer composer) {
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
                composer.composeNoShowMessage(r, enrolment.getUser(), exam);
                Logger.info("Email sent to {}", r.getEmail());
            }
        }
    }
}
