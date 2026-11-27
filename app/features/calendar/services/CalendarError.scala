// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.calendar.services

/** Error types for calendar operations */
sealed trait CalendarError:
  def message: String

object CalendarError:
  case object ReservationInEffect extends CalendarError:
    val message = "i18n_reservation_in_effect"

  case object EnrolmentNotFound extends CalendarError:
    val message = "i18n_error_enrolment_not_found"

  case object NoMachinesAvailable extends CalendarError:
    val message = "i18n_no_machines_available"

  case object Forbidden extends CalendarError:
    val message = "Forbidden"

  case object NotFound extends CalendarError:
    val message = "NotFound"

  case class InvalidReservation(message: String) extends CalendarError
