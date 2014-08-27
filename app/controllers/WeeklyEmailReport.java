package controllers;

import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamParticipation;
import models.User;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Controller;
import util.java.EmailComposer;

import java.sql.Timestamp;
import java.util.List;

public class WeeklyEmailReport extends Controller implements Runnable {
    @Override
    public void run() {
        Logger.info("Running weekly email report");
        try {

            List<User> teachers = Ebean.find(User.class)
                    .fetch("roles")
                    .where()
                    .eq("roles.name", "TEACHER")
                    .findList();

            for( User teacher : teachers) {
                EmailComposer.composeWeeklySummary(teacher);
            }

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
