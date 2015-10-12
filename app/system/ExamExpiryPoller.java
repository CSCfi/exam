package system;

import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamRecord;
import play.Logger;
import util.AppUtil;

import javax.inject.Singleton;
import java.util.Date;
import java.util.List;

@Singleton
public class ExamExpiryPoller implements Runnable {

    @Override
    public void run() {
        Logger.info("Running exam expiration check ...");
        List<Exam> exams = Ebean.find(Exam.class)
                .where()
                .disjunction()
                .eq("state", Exam.State.GRADED_LOGGED)
                .eq("state", Exam.State.ARCHIVED)
                .eq("state", Exam.State.ABORTED)
                .endJunction()
                .findList();

        Date now = new Date();
        for (Exam exam : exams) {
            Date expirationDate = exam.getState() == Exam.State.ABORTED ?
                    exam.getExamParticipations().get(0).getEnded() : exam.getGradedTime();
            if (AppUtil.getExamExpirationDate(expirationDate).before(now)) {
                cleanExamData(exam);
                Logger.info("... Marked exam {} as expired", exam.getId());
            }
        }
        Logger.info("... Done");
    }

    /**
     * Disassociate exam from its creator, set state to deleted and erase any associated exam records
     */
    private void cleanExamData(Exam exam) {
        exam.setState(Exam.State.DELETED);
        exam.setCreator(null);
        exam.update();
        Ebean.find(ExamRecord.class).where().eq("exam", exam).findList().forEach(ExamRecord::delete);
    }

}
