package system;

import akka.actor.Props;
import akka.actor.UntypedActor;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamEnrolment;
import play.Logger;
import util.java.EmailComposer;
import util.java.NoShowHandlerUtil;

import java.util.Date;
import java.util.List;

class ReservationPollerActor extends UntypedActor {

    public static Props props = Props.create(ReservationPollerActor.class);

    @Override
    public void onReceive(Object message) throws Exception {
        Logger.debug("{}: Running no-show check ...", getClass().getCanonicalName());
        EmailComposer composer = (EmailComposer) message;
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .where()
                .eq("reservation.noShow", false)
                .lt("reservation.endAt", new Date())
                .eq("exam.state", Exam.State.PUBLISHED)
                .findList();

        if (enrolments.isEmpty()) {
            Logger.debug("{}: ... none found.", getClass().getCanonicalName());
        } else {
            NoShowHandlerUtil.handleNoShows(enrolments, composer, getClass());
        }
    }

}
