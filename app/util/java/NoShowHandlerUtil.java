package util.java;

import models.*;
import play.Logger;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class NoShowHandlerUtil {

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
