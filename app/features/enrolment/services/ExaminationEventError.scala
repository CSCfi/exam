// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.services

/** Error types for examination event operations */
sealed trait ExaminationEventError:
  def message: String

object ExaminationEventError:
  case object ExamNotFound extends ExaminationEventError:
    val message = "exam not found"

  case object ExaminationDateNotFound extends ExaminationEventError:
    val message = "examination date not found"

  case object EventNotFound extends ExaminationEventError:
    val message = "event not found"

  case object EventInThePast extends ExaminationEventError:
    val message = "i18n_error_examination_event_in_the_past"

  case object ConflictsWithMaintenancePeriod extends ExaminationEventError:
    val message = "i18n_error_conflicts_with_maintenance_period"

  case object MaxCapacityExceeded extends ExaminationEventError:
    val message = "i18n_error_max_capacity_exceeded"

  case object NoQuitPasswordProvided extends ExaminationEventError:
    val message = "no quit password provided"

  case object NoSettingsPasswordProvided extends ExaminationEventError:
    val message = "no settings password provided"

  case object EventHasEnrolments extends ExaminationEventError:
    val message = "event can not be deleted because there are enrolments involved"

  case object PasswordEncryptionFailed extends ExaminationEventError:
    val message = "failed to encrypt password"
