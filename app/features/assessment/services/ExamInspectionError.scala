// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

/** Error types for exam inspection operations */
sealed trait ExamInspectionError:
  def message: String

object ExamInspectionError:
  case object InspectionNotFound extends ExamInspectionError:
    val message = "Inspection not found"

  case object UserNotFound extends ExamInspectionError:
    val message = "User not found"

  case object ExamNotFound extends ExamInspectionError:
    val message = "Exam not found"

  case object AccessForbidden extends ExamInspectionError:
    val message = "i18n_error_access_forbidden"

  case object AlreadyInspector extends ExamInspectionError:
    val message = "already an inspector"

  case object ExamNameMissing extends ExamInspectionError:
    val message = "i18n_exam_name_missing_or_too_short"
