/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

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
