// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

/** Error types for exam record operations */
sealed trait ExamRecordError:
  def message: String

object ExamRecordError:
  case object ExamNotFound extends ExamRecordError:
    val message = "i18n_error_exam_not_found"

  case object ParticipationNotFound extends ExamRecordError:
    val message = "Participation not found"

  case object AccessForbidden extends ExamRecordError:
    val message = "You are not allowed to modify this object"

  case object NotYetGraded extends ExamRecordError:
    val message = "not yet graded by anyone!"

  case object AlreadyGradedLogged extends ExamRecordError:
    val message = "i18n_error_exam_already_graded_logged"

  case object ErrorCreatingCsvFile extends ExamRecordError:
    val message = "i18n_error_creating_csv_file"

  case object ErrorCreatingExcelFile extends ExamRecordError:
    val message = "i18n_error_creating_csv_file"
