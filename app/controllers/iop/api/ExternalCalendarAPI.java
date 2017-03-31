package controllers.iop.api;

import com.google.inject.ImplementedBy;
import controllers.iop.ExternalCalendarController;
import models.Reservation;
import play.mvc.Result;

import java.net.MalformedURLException;
import java.util.concurrent.CompletionStage;

@ImplementedBy(ExternalCalendarController.class)
public interface ExternalCalendarAPI {

     CompletionStage<Result> removeReservation(Reservation reservation);
     CompletionStage<Result> requestEnrolment(Long id) throws MalformedURLException;
}

