// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.services

/** Error types for reservation operations */
sealed trait ReservationError:
  def message: String

object ReservationError:
  case object ReservationNotFound extends ReservationError:
    val message = "No reservation with id"

  case object EnrolmentNotFound extends ReservationError:
    val message = "Enrolment not found"

  case object ExamNotFound extends ReservationError:
    val message = "Exam not found"

  case object MachineNotFound extends ReservationError:
    val message = "Machine not found"

  case object RoomNotFound extends ReservationError:
    val message = "Room not found"

  case object ParticipationExists extends ReservationError:
    val message = "i18n_unable_to_remove_reservation"

  case object MachineNotEligible extends ReservationError:
    val message = "Machine not eligible for choosing"

  case object SuitableSlotNotFound extends ReservationError:
    val message = "Could not find suitable slot"

  case class InvalidReservation(message: String) extends ReservationError
