package controllers.iop.api;

import com.google.inject.ImplementedBy;
import controllers.iop.ExternalCalendarController;
import models.ExamEnrolment;
import models.Reservation;
import models.User;
import play.mvc.Result;

import java.net.MalformedURLException;
import java.util.concurrent.CompletionStage;

@ImplementedBy(ExternalCalendarController.class)
public interface ExternalCalendarAPI {

     CompletionStage<Result> removeReservation(Reservation reservation);
     CompletionStage<ExamEnrolment> requestEnrolment(User user, Reservation reservation) throws MalformedURLException;
}

