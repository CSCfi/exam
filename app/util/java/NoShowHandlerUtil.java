package util.java;

import models.*;
import play.Logger;

import javax.inject.Inject;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class NoShowHandlerUtil implements NoShowHandler {

    @Inject
    private EmailComposer composer;

    public void handleNoShows(List<ExamEnrolment> noShows, Class<?> sender) {
        for (ExamEnrolment enrolment : noShows) {
            handleNoShow(enrolment);
            if (sender != null) {
                Logger.info("{}: ... marked reservation {} as no-show", sender.getCanonicalName(),
                        enrolment.getReservation().getId());
            }
        }
    }

    public void handleNoShow(ExamEnrolment enrolment) {
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
