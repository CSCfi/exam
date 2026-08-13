// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.services

sealed trait RoomError:
  def message: String

object RoomError:
  case object RoomNotFound extends RoomError:
    override val message: String = "room not found"
  case object AddressNotFound extends RoomError:
    override val message: String = "address not found"
  case object WorkingHoursNotFound extends RoomError:
    override val message: String = "working hours or room not found"
  case object ExceptionNotFound extends RoomError:
    override val message: String = "exception or room not found"
  case object FacilityIdRequired extends RoomError:
    override val message: String = "facilityId is required"
  case object FacilityNotFound extends RoomError:
    override val message: String = "Facility not found"
  case object InvalidPassword extends RoomError:
    override val message: String = "Invalid password"
  case object InvalidFacilityPassword extends RoomError:
    override val message: String = "Invalid password for facility"
