// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.api;

import com.google.inject.ImplementedBy;
import controllers.iop.transfer.impl.ExternalExamController;
import java.net.MalformedURLException;
import java.util.concurrent.CompletionStage;
import models.ExamEnrolment;
import models.Reservation;
import models.User;

@FunctionalInterface
@ImplementedBy(ExternalExamController.class)
public interface ExternalExamAPI {
    CompletionStage<ExamEnrolment> requestEnrolment(User user, Reservation reservation) throws MalformedURLException;
}
