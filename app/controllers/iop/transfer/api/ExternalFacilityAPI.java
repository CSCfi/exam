// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.api;

import com.google.inject.ImplementedBy;
import controllers.iop.transfer.impl.FacilityController;
import java.net.MalformedURLException;
import java.util.concurrent.CompletionStage;
import models.ExamRoom;
import play.mvc.Result;

@ImplementedBy(FacilityController.class)
public interface ExternalFacilityAPI {
    CompletionStage<Result> updateFacility(ExamRoom room) throws MalformedURLException;
    CompletionStage<Result> activateFacility(Long roomId) throws MalformedURLException;
    CompletionStage<Result> inactivateFacility(Long roomId) throws MalformedURLException;
}
