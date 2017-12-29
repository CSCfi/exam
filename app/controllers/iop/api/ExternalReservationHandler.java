package controllers.iop.api;

import com.google.inject.ImplementedBy;
import controllers.iop.ExternalReservationHandlerImpl;
import models.Reservation;
import models.User;
import play.mvc.Result;

import java.util.concurrent.CompletionStage;

@FunctionalInterface
@ImplementedBy(ExternalReservationHandlerImpl.class)
public interface ExternalReservationHandler {
    CompletionStage<Result> removeReservation(Reservation reservation, User user);
}
