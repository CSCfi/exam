import com.avaje.ebean.Ebean;
import models.*;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Controller;
import util.SitnetUtil;

import java.sql.Timestamp;
import java.util.List;

public class ReviewRunner extends Controller implements Runnable {
    @Override
    public void run() {
        Logger.info("Running exam participation clean up ..");
        try {
            final List<ExamParticipation> participations = getNotEndedParticipations();

            if (participations == null || participations.isEmpty()) {
                Logger.info(" .. no \"dirty participations\" found. Shutting down.");
                return;
            }
            Logger.info(" .. found {} \"dirty participations\", running clean up.", participations.size());
            markEnded(participations);
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    private void markEnded(List<ExamParticipation> participations) {
        for (ExamParticipation participation : participations) {
            final Exam exam = participation.getExam();
            int duration = exam.getDuration();

            ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                    .select("reservation.machine.room.transitionTime")
                    .fetch("reservation")
                    .fetch("reservation.machine")
                    .fetch("reservation.machine.room")
                    .where()
                    .eq("exam.id", exam.getId())
                    .findUnique();

            if (enrolment != null && enrolment.getReservation() != null) {
                ExamRoom room = enrolment.getReservation().getMachine().getRoom();
                int transitionTime = Integer.parseInt(room.getTransitionTime());

                DateTime participationTimeLimit
                        = new DateTime(participation.getStarted())
                        .plusMinutes(duration)
                                //todo: room translatation time?
                                //todo: is there any other edge cases, eg. late participation
                                //todo: or if user can somehow extend room reservation, in late participations
                                //add 15min "safe period" in here.
                        .plusMinutes(transitionTime / 2);

                if (participationTimeLimit.isBeforeNow()) {
                    participation.setEnded(SitnetUtil.getNowTime());
                    participation.setDuration(new Timestamp(participation.getEnded().getTime() - participation.getStarted().getTime()));

                    GeneralSettings settings = Ebean.find(GeneralSettings.class, 1);
                    participation.setDeadline(new Timestamp(participation.getEnded().getTime() + settings.getReviewDeadline()));

                    participation.save();
                    String state = Exam.State.REVIEW.toString();
                    Logger.info("Setting exam ({}) state to {}", exam.getId(), state);
                    exam.setState(state);
                    exam.save();
                }
            }
        }
    }

    private List<ExamParticipation> getNotEndedParticipations() {
        List<ExamParticipation> participation = Ebean.find(ExamParticipation.class)
                .fetch("exam")
                .where()
                .eq("ended", null)
                .findList();
        return participation;
    }
}
