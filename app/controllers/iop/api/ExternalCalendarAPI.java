package controllers.iop.api;

import com.google.inject.ImplementedBy;
import controllers.iop.ExternalCalendarController;
import models.ExamEnrolment;
import play.mvc.Result;

import java.util.concurrent.CompletionStage;

@ImplementedBy(ExternalCalendarController.class)
public interface ExternalCalendarAPI {

     CompletionStage<Result> removeReservation(ExamEnrolment enrolment);
}

