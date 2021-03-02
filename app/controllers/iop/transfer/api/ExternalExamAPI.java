/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package controllers.iop.transfer.api;

import controllers.iop.transfer.impl.ExternalExamController;
import models.ExamEnrolment;
import models.Reservation;
import models.User;
import com.google.inject.ImplementedBy;
import java.net.MalformedURLException;
import java.util.concurrent.CompletionStage;

@FunctionalInterface
@ImplementedBy(ExternalExamController.class)
public interface ExternalExamAPI {
    CompletionStage<ExamEnrolment> requestEnrolment(User user, Reservation reservation) throws MalformedURLException;
}
