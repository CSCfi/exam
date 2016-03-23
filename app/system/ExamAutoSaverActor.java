package system;

import akka.actor.Props;
import akka.actor.UntypedActor;
import com.avaje.ebean.Ebean;
import controllers.SettingsController;
import models.*;
import org.joda.time.DateTime;
import play.Logger;
import util.AppUtil;
import util.java.EmailComposer;

import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

class ExamAutoSaverActor extends UntypedActor {

    static final Props props = Props.create(ExamAutoSaverActor.class);

    @Override
    public void onReceive(Object message) throws Exception {
        Logger.debug("{}: Checking for ongoing exams ...", getClass().getCanonicalName());
        EmailComposer composer = (EmailComposer) message;
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam")
                .fetch("reservation")
                .fetch("reservation.machine.room")
                .where()
                .isNull("ended")
                .isNotNull("reservation")
                .findList();

        if (participations == null || participations.isEmpty()) {
            Logger.debug("{}: ... none found.", getClass().getCanonicalName());
            return;
        }
        markEnded(participations, composer);
    }

    private void markEnded(List<ExamParticipation> participations, EmailComposer emailComposer) {
        for (ExamParticipation participation : participations) {
            Exam exam = participation.getExam();
            Reservation reservation = participation.getReservation();
            DateTime reservationStart = new DateTime(reservation.getStartAt());
            DateTime participationTimeLimit = reservationStart.plusMinutes(exam.getDuration());
            DateTime now = AppUtil.adjustDST(DateTime.now(), reservation.getMachine().getRoom());
            if (participationTimeLimit.isBefore(now)) {
                participation.setEnded(now.toDate());
                participation.setDuration(
                        new Date(participation.getEnded().getTime() - participation.getStarted().getTime()));

                GeneralSettings settings = SettingsController.getOrCreateSettings("review_deadline", null, "14");
                int deadlineDays = Integer.parseInt(settings.getValue());
                Date deadline = new DateTime(participation.getEnded()).plusDays(deadlineDays).toDate();
                participation.setDeadline(deadline);

                participation.save();
                Logger.info("{}: ... setting exam {} state to REVIEW", getClass().getCanonicalName(), exam.getId());
                exam.setState(Exam.State.REVIEW);
                exam.save();
                if (exam.isPrivate()) {
                    // Notify teachers
                    Set<User> recipients = new HashSet<>();
                    recipients.addAll(exam.getParent().getExamOwners());
                    recipients.addAll(exam.getExamInspections().stream().map(
                            ExamInspection::getUser).collect(Collectors.toSet()));
                    AppUtil.notifyPrivateExamEnded(recipients, exam, emailComposer);
                }
            } else {
                Logger.info("{}: ... exam {} is ongoing until {}", getClass().getCanonicalName(), exam.getId(),
                        participationTimeLimit);
            }
        }
    }

}
