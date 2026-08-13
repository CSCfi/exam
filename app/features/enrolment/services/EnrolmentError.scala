// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.services

/** Error types for enrolment operations */
sealed trait EnrolmentError:
  def message: String

object EnrolmentError:
  case object ExamNotFound extends EnrolmentError:
    val message = "i18n_error_exam_not_found"

  case object EnrolmentNotFound extends EnrolmentError:
    val message = "enrolment not found"

  case object ConfigNotFound extends EnrolmentError:
    val message = "config not found"

  case object RoomNotFound extends EnrolmentError:
    val message = "Room not found"

  case object EnrolmentExists extends EnrolmentError:
    val message = "i18n_error_enrolment_exists"

  case object ReservationInEffect extends EnrolmentError:
    val message = "i18n_reservation_in_effect"

  case object AssessmentNotReceived extends EnrolmentError:
    val message = "i18n_enrolment_assessment_not_received"

  case object AccessForbidden extends EnrolmentError:
    val message = "i18n_error_access_forbidden"

  case object NoTrialsLeft extends EnrolmentError:
    val message = "i18n_no_trials_left"

  case object PrivateExam extends EnrolmentError:
    val message = "Private exam"

  case object CancelReservationFirst extends EnrolmentError:
    val message = "i18n_cancel_reservation_first"

  case object NotPossibleToRemoveParticipant extends EnrolmentError:
    val message = "i18n_not_possible_to_remove_participant"

  case object MaxEnrolmentsReached extends EnrolmentError:
    val message = "i18n_error_max_enrolments_reached"

  case object EventInPast extends EnrolmentError:
    val message = "Event in the past"

  case object UserNotFoundOrAlreadyEnrolled extends EnrolmentError:
    val message = "user not found or already enrolled"

  case object MultipleFutureReservations extends EnrolmentError:
    val message = "Multiple future reservations"

  case object MultipleFutureEvents extends EnrolmentError:
    val message = "Multiple future events"

  case class InvalidEnrolment(message: String) extends EnrolmentError
