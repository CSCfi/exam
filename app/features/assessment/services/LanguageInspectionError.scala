// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

/** Error types for language inspection operations */
sealed trait LanguageInspectionError:
  def message: String

object LanguageInspectionError:
  case object ExamNotFound extends LanguageInspectionError:
    val message = "i18n_error_exam_not_found"

  case object InspectionNotFound extends LanguageInspectionError:
    val message = "inspection not found"

  case object AlreadySentForInspection extends LanguageInspectionError:
    val message = "already sent for inspection"

  case object NotAllowedForLanguageInspection extends LanguageInspectionError:
    val message = "not allowed for language inspection"

  case object AlreadyAssigned extends LanguageInspectionError:
    val message = "Inspection already assigned"

  case object NotAssigned extends LanguageInspectionError:
    val message = "Inspection not assigned"

  case object AlreadyFinalized extends LanguageInspectionError:
    val message = "Inspection already finalized"

  case object NoStatementGiven extends LanguageInspectionError:
    val message = "No statement given"
