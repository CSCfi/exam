// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

sealed trait ReservationAPIError:
  def message: String

object ReservationAPIError:
  case object NoSearchDate extends ReservationAPIError:
    val message = "no search date given"
  case object RoomNotFound extends ReservationAPIError:
    val message = "room not found"
