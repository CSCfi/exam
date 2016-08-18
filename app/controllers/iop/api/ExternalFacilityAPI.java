package controllers.iop.api;

import com.google.inject.ImplementedBy;
import controllers.iop.FacilityController;
import models.ExamRoom;
import play.mvc.Result;

import java.net.MalformedURLException;
import java.util.concurrent.CompletionStage;

@ImplementedBy(FacilityController.class)
public interface ExternalFacilityAPI {

    CompletionStage<Result> updateFacility(ExamRoom room) throws MalformedURLException;
    CompletionStage<Result> activateFacility(Long roomId) throws MalformedURLException;
    CompletionStage<Result> inactivateFacility(Long roomId) throws MalformedURLException;

}
