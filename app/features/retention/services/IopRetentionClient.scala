// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.retention.services

import cats.effect.IO
import models.enrolment.Reservation
import services.iop.DeliveryResult

/** Calls to the XM proxy that retention needs before local rows can go. Implementations treat a
  * document XM no longer has as already deleted, and return a failed call as a result rather than a
  * failed IO.
  */
trait IopRetentionClient:
  /** Deletes a visiting reservation at XM and, through XM, at the hosting organization. */
  def deleteReservation(reservation: Reservation): IO[DeliveryResult]

  /** Deletes an answer attachment of a visiting exam attempt from XM. */
  def deleteAttachment(externalId: String): IO[DeliveryResult]
