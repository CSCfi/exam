// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.services

/** Error types for student actions operations */
sealed trait StudentActionsError:
  def message: String

object StudentActionsError:
  case object ExamNotFound extends StudentActionsError:
    val message = "i18n_error_exam_not_found"

  case object EnrolmentNotFound extends StudentActionsError:
    val message = "Enrolment not found"

  case object CollaborativeExamNotFound extends StudentActionsError:
    val message = "Collaborative exam not found"

  case object ExamConfigNotAvailable extends StudentActionsError:
    val message = "Exam config not available"

  case object ErrorCreatingExcelFile extends StudentActionsError:
    val message = "i18n_error_creating_excel_file"

  case object ErrorCreatingConfigFile extends StudentActionsError:
    val message = "Error creating config file"
