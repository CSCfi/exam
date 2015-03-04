import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamEnrolment;
import models.ExamParticipation;
import models.GeneralSettings;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Controller;

import java.util.Date;
import java.util.List;

public class ReviewRunner extends Controller implements Runnable {

    @Override
    public void run() {
        Logger.info("Running exam participation clean up ...");
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam")
                .where()
                .eq("ended", null)
                .findList();

        if (participations == null || participations.isEmpty()) {
            Logger.info(" -> no dirty participations found.");
            return;
        }
        markEnded(participations);
    }

    private void markEnded(List<ExamParticipation> participations) {
        for (ExamParticipation participation : participations) {
            Exam exam = participation.getExam();

            ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                    .select("reservation.machine.room.transitionTime")
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
                    String state = Exam.State.REVIEW.toString();
                    Logger.info(" -> setting exam {} state to REVIEW", exam.getId());
                    exam.setState(state);
                    exam.save();
                } else {
                    Logger.info(" -> exam {} is ongoing until {}", exam.getId(), participationTimeLimit);
                }
            }
        }
    }

}
