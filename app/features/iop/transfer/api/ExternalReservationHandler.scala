// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.api

import com.google.inject.ImplementedBy
import features.iop.transfer.impl.ExternalReservationHandlerImpl
import models.enrolment.Reservation
import models.user.User
import play.api.mvc.Result

import scala.concurrent.Future

@ImplementedBy(classOf[ExternalReservationHandlerImpl])
trait ExternalReservationHandler:
  def removeReservation(reservation: Reservation, user: User, msg: String): Future[Result]
  def removeExternalReservation(reservation: Reservation): Future[Option[Int]]
