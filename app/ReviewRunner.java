import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamParticipation;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Controller;

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
            Logger.info(" .. found \"dirty {} participations\", running clean up.", participations.size());
            markEnded(participations);
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }

    private void markEnded(List<ExamParticipation> participations) {
        for (ExamParticipation participation : participations) {
            final Exam exam = participation.getExam();
            int duration = exam.getDuration();
            DateTime participationTimeLimit
                    = new DateTime(participation.getStarted())
                    .plusMinutes(duration)
                            //todo: room translatation time?
                            //todo: is there any other edge cases, eg. late participation
                            //todo: or if user can somehow extend room reservation, in late participations
                            //add 15min "safe period" in here.
                    .plusMinutes(15);

            if (participationTimeLimit.isBeforeNow()) {
                participation.setEnded(new Timestamp(DateTime.now().getMillis()));
                participation.save();
                String state = Exam.State.REVIEW.toString();
                Logger.info("Setting exam ({}) state to {}", exam.getId(), state);
                exam.setState(state);
                exam.save();
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
