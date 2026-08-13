// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

sealed trait ExternalExamError:
  def message: String

object ExternalExamError:
  case object EnrolmentNotFound extends ExternalExamError:
    val message = "Enrolment not found"
  case object InvalidExternalExamData extends ExternalExamError:
    val message = "Invalid external exam data"
  case object ParentExamNotFound extends ExternalExamError:
    val message = "Parent exam not found"
  case object FailedToCreateAssessment extends ExternalExamError:
    val message = "Failed to create assessment"
  case object CouldNotDownloadCollaborativeExam extends ExternalExamError:
    val message = "Could not download collaborative exam"
  case object FailedToProvideEnrolment extends ExternalExamError:
    val message = "Failed to provide enrolment"
