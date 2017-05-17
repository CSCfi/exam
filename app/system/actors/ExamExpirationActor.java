package system.actors;

import akka.actor.Props;
import akka.actor.UntypedActor;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamRecord;
import org.joda.time.DateTime;
import play.Logger;
import util.AppUtil;

import java.util.List;

public class ExamExpirationActor extends UntypedActor {

    public static final Props props = Props.create(ExamExpirationActor.class);

    @Override
    public void onReceive(Object message) throws Exception {
        Logger.debug("{}: Running exam expiration check ...", getClass().getCanonicalName());
        List<Exam> exams = Ebean.find(Exam.class)
                .where()
                .disjunction()
                .eq("state", Exam.State.GRADED_LOGGED)
                .eq("state", Exam.State.ARCHIVED)
                .eq("state", Exam.State.ABORTED)
                .endJunction()
                .findList();

        DateTime now = DateTime.now();
        for (Exam exam : exams) {
            DateTime expirationDate = exam.getState() == Exam.State.ABORTED ?
                    exam.getExamParticipations().get(0).getEnded() : exam.getGradedTime();
            if (expirationDate == null) {
                Logger.error("no grading time for exam #" + exam.getId().toString());
                continue;
            }
            if (AppUtil.getExamExpirationDate(expirationDate).isBefore(now) ) {
                cleanExamData(exam);
                Logger.info("{}: ... Marked exam {} as expired", getClass().getCanonicalName(), exam.getId());
            }
        }
        Logger.debug("{}: ... Done", getClass().getCanonicalName());
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
