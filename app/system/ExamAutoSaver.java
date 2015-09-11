package system;

import com.avaje.ebean.Ebean;
import models.*;
import org.joda.time.DateTime;
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
public class ExamAutoSaver implements Runnable {

    EmailComposer emailComposer;

    public ExamAutoSaver(EmailComposer composer) {
        emailComposer = composer;
    }

    @Override
    public void run() {
        Logger.info("Checking for ongoing exams ...");
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam")
                .where()
                .eq("ended", null)
                .findList();

        if (participations == null || participations.isEmpty()) {
            Logger.info(" -> none found.");
            return;
        }
        markEnded(participations);
    }

    private void markEnded(List<ExamParticipation> participations) {
        for (ExamParticipation participation : participations) {
            Exam exam = participation.getExam();

            ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                    .fetch("exam")
                    .fetch("reservation")
                    .fetch("reservation.machine")
                    .fetch("reservation.machine.room")
                    .where()
                    .eq("exam.id", exam.getId())
                    .findUnique();

            if (enrolment != null && enrolment.getReservation() != null) {
                DateTime reservationStart = new DateTime(enrolment.getReservation().getStartAt());
                DateTime participationTimeLimit = reservationStart.plusMinutes(exam.getDuration());

                if (participationTimeLimit.isBeforeNow()) {
                    participation.setEnded(new Date());
                    participation.setDuration(new Date(participation.getEnded().getTime() - participation.getStarted().getTime()));

                    GeneralSettings settings = Ebean.find(GeneralSettings.class, 1);
                    participation.setDeadline(new Date(participation.getEnded().getTime() + settings.getReviewDeadline()));

                    participation.save();
                    Logger.info(" -> setting exam {} state to REVIEW", exam.getId());
                    exam.setState(Exam.State.REVIEW);
                    exam.save();
                    if (exam.isPrivate()) {
                        // Notify teachers
                        Set<User> recipients = new HashSet<>();
                        recipients.addAll(exam.getExamOwners());
                        recipients.addAll(exam.getExamInspections().stream().map(
                                ExamInspection::getUser).collect(Collectors.toSet()));
                        for (User r : recipients) {
                            try {
                                emailComposer.composePrivateExamEnded(r, exam);
                                Logger.info("Email sent to {}", r.getEmail());
                            } catch (IOException e) {
                                Logger.error("Failed to send email", e);
                            }
                        }
                    }
                } else {
                    Logger.info(" -> exam {} is ongoing until {}", exam.getId(), participationTimeLimit);
                }
            }
        }
    }

}
