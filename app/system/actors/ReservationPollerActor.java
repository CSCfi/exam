package system.actors;

import akka.actor.AbstractActor;
import io.ebean.Ebean;
import models.Reservation;
import org.joda.time.DateTime;
import play.Logger;
import util.AppUtil;
import util.java.NoShowHandler;

import javax.inject.Inject;
import java.util.List;

public class ReservationPollerActor extends AbstractActor {

    private NoShowHandler handler;

    @Inject
    public ReservationPollerActor(NoShowHandler handler) {
        this.handler = handler;
    }

    @Override
    public Receive createReceive() {
        return receiveBuilder().match(String.class, s -> {
            Logger.debug("{}: Running no-show check ...", getClass().getCanonicalName());
            DateTime now = AppUtil.adjustDST(DateTime.now());
            List<Reservation> reservations = Ebean.find(Reservation.class)
                    .fetch("enrolment")
                    .fetch("enrolment.exam")
                    .fetch("enrolment.externalExam")
                    .where()
                    .eq("noShow", false)
                    .lt("endAt", now.toDate())
                    .isNull("externalReservation")
                    .findList();

            if (reservations.isEmpty()) {
                Logger.debug("{}: ... none found.", getClass().getCanonicalName());
            } else {
                handler.handleNoShows(reservations);
            }

        }).build();
    }

}
