package system.actors;

import akka.actor.AbstractActor;
import io.ebean.Ebean;
import models.Reservation;
import org.joda.time.DateTime;
import play.Logger;
import util.AppUtil;
import impl.EmailComposer;

import javax.inject.Inject;

public class ReservationReminderActor extends AbstractActor {

    private EmailComposer emailComposer;

    @Inject
    public ReservationReminderActor(EmailComposer emailComposer) {
        this.emailComposer = emailComposer;
    }

    private void remind(Reservation r) {
        emailComposer.composeReservationNotification(
                r.getUser(), r, r.getEnrolment().getExam(), true);
        r.setReminderSent(true);
        r.update();
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder().match(String.class, s -> {
            Logger.debug("{}: Running reservation reminder task ...", getClass().getCanonicalName());
            DateTime now = AppUtil.adjustDST(DateTime.now());
            DateTime tomorrow = now.plusDays(1);
            Ebean.find(Reservation.class)
                    .where()
                    .between("startAt", now, tomorrow)
                    .ne("reminderSent", true)
                    .findList()
                    .forEach(this::remind);
            Logger.debug("{}: Reservation reminder task done", getClass().getCanonicalName());

        }).build();
    }

}
