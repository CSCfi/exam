// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.api;

import com.google.inject.ImplementedBy;
import controllers.iop.transfer.impl.ExternalReservationHandlerImpl;
import java.util.Optional;
import java.util.concurrent.CompletionStage;
import models.enrolment.Reservation;
import models.user.User;
import play.mvc.Result;

@ImplementedBy(ExternalReservationHandlerImpl.class)
public interface ExternalReservationHandler {
    CompletionStage<Result> removeReservation(Reservation reservation, User user, String msg);
    CompletionStage<Optional<Integer>> removeExternalReservation(Reservation reservation);
}
