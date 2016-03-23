package system;

import akka.actor.Props;
import akka.actor.UntypedActor;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamRecord;
import play.Logger;
import util.AppUtil;

import java.util.Date;
import java.util.List;

class ExamExpirationActor extends UntypedActor {

    static final Props props = Props.create(ExamExpirationActor.class);

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

        Date now = new Date();
        for (Exam exam : exams) {
            Date expirationDate = exam.getState() == Exam.State.ABORTED ?
                    exam.getExamParticipations().get(0).getEnded() : exam.getGradedTime();
            if (AppUtil.getExamExpirationDate(expirationDate).before(now)) {
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
