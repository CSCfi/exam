package system.actors;

import akka.actor.UntypedActor;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamEnrolment;
import org.joda.time.DateTime;
import play.Logger;
import util.AppUtil;
import util.java.NoShowHandler;

import javax.inject.Inject;
import java.util.List;

public class ReservationPollerActor extends UntypedActor {

    private NoShowHandler handler;

    @Inject
    public ReservationPollerActor(NoShowHandler handler) {
        this.handler = handler;
    }

    private ReservationPollerActor() {
        // Needed by guice
    }


    @Override
    public void onReceive(Object message) throws Exception {
        Logger.debug("{}: Running no-show check ...", getClass().getCanonicalName());
        DateTime now = AppUtil.adjustDST(DateTime.now());
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where()
                .eq("reservation.noShow", false)
                .lt("reservation.endAt", now.toDate())
                .eq("exam.state", Exam.State.PUBLISHED)
                .findList();

        if (enrolments.isEmpty()) {
            Logger.debug("{}: ... none found.", getClass().getCanonicalName());
        } else {
            handler.handleNoShows(enrolments, getClass());
        }
    }

}
