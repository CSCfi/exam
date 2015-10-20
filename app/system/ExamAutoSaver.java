package system;

import com.avaje.ebean.Ebean;
import controllers.SettingsController;
import models.*;
import org.joda.time.DateTime;
import play.Logger;
import util.AppUtil;
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
                .fetch("reservation")
                .fetch("reservation.machine.room")
                .where()
                .eq("ended", null)
                .isNotNull("reservation")
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
            Reservation reservation = participation.getReservation();
            DateTime reservationStart = new DateTime(reservation.getStartAt());
            DateTime participationTimeLimit = reservationStart.plusMinutes(exam.getDuration());
            DateTime now = AppUtil.adjustDST(DateTime.now(), reservation.getMachine().getRoom());
            if (participationTimeLimit.isBefore(now)) {
                participation.setEnded(now.toDate());
                participation.setDuration(new Date(participation.getEnded().getTime() - participation.getStarted().getTime()));
                GeneralSettings settings = SettingsController.getOrCreateSettings("review_deadline", null, "14");
                int deadlineDays = Integer.parseInt(settings.getValue());
                Date deadline = new DateTime(participation.getEnded()).plusDays(deadlineDays).toDate();
                participation.setDeadline(deadline);

                participation.save();
                Logger.info(" -> setting exam {} state to REVIEW", exam.getId());
                exam.setState(Exam.State.REVIEW);
                exam.save();
                if (exam.isPrivate()) {
                    // Notify teachers
                    Set<User> recipients = new HashSet<>();
                    recipients.addAll(exam.getParent().getExamOwners());
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
