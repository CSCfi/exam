package controllers.iop.api;


import com.google.inject.ImplementedBy;
import controllers.iop.ExternalExamController;
import models.ExamEnrolment;
import models.Reservation;
import models.User;

import java.net.MalformedURLException;
import java.util.concurrent.CompletionStage;

@FunctionalInterface
@ImplementedBy(ExternalExamController.class)
public interface ExternalExamAPI {
    CompletionStage<ExamEnrolment> requestEnrolment(User user, Reservation reservation) throws MalformedURLException;
}
