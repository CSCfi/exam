import com.avaje.ebean.Ebean;
import models.*;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.LocalDateTime;
import play.Logger;
import play.mvc.Controller;
import util.SitnetUtil;

import java.sql.Timestamp;
import java.util.List;

public class ReviewRunner extends Controller implements Runnable {

    @Override
    public void run() {
        Logger.info("Running exam participation clean up ...");
        try {
            final List<ExamParticipation> participations = getNotEndedParticipations();

            if (participations == null || participations.isEmpty()) {
                Logger.info(" -> no dirty participations found.");
                return;
            }
            markEnded(participations);
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    private void markEnded(List<ExamParticipation> participations) {
        for (ExamParticipation participation : participations) {
            final Exam exam = participation.getExam();

            ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                    .select("reservation.machine.room.transitionTime")
                    .fetch("reservation")
                    .fetch("reservation.machine")
                    .fetch("reservation.machine.room")
                    .where()
                    .eq("exam.id", exam.getId())
                    .findUnique();

            if (enrolment != null && enrolment.getReservation() != null) {

                DateTime now =  DateTime.now().plus(DateTimeZone.forID("Europe/Helsinki").getOffset(DateTime.now()));
                DateTime reservationStart = new DateTime(enrolment.getReservation().getStartAt());
                DateTime participationTimeLimit = reservationStart.plusMinutes(exam.getDuration());

                if (participationTimeLimit.isBefore(now)) {
                    participation.setEnded(SitnetUtil.getNowTime());
                    participation.setDuration(new Timestamp(participation.getEnded().getTime() - participation.getStarted().getTime()));

                    GeneralSettings settings = Ebean.find(GeneralSettings.class, 1);
                    participation.setDeadline(new Timestamp(participation.getEnded().getTime() + settings.getReviewDeadline()));

                    participation.save();
                    String state = Exam.State.REVIEW.toString();
                    Logger.info(" -> setting exam {} state to REVIEW", exam.getId());
                    exam.setState(state);
                    exam.save();
                } else {
                    Logger.info(" -> exam {} is ongoing until {} EET", exam.getId(), new LocalDateTime(participationTimeLimit));
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
