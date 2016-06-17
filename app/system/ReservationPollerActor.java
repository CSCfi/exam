package system;

import akka.actor.Props;
import akka.actor.UntypedActor;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamEnrolment;
import org.joda.time.DateTime;
import play.Logger;
import util.AppUtil;
import util.java.EmailComposer;
import util.java.NoShowHandlerUtil;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

class ReservationPollerActor extends UntypedActor {

    static final Props props = Props.create(ReservationPollerActor.class);

    @Override
    public void onReceive(Object message) throws Exception {
        Logger.debug("{}: Running no-show check ...", getClass().getCanonicalName());
        EmailComposer composer = (EmailComposer) message;
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
            NoShowHandlerUtil.handleNoShows(enrolments, composer, getClass());
        }
    }

}
