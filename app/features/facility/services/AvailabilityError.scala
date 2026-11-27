// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.services

sealed trait AvailabilityError:
  def message: String

object AvailabilityError:
  case object RoomNotFound extends AvailabilityError:
    override val message: String = "room not found"
