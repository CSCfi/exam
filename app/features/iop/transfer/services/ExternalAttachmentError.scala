// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

sealed trait ExternalAttachmentError:
  def message: String

object ExternalAttachmentError:
  case object ExternalExamNotFound extends ExternalAttachmentError:
    val message = "External exam not found"
  case object ExamNotFound extends ExternalAttachmentError:
    val message = "Exam not found"
  case object AttachmentNotFound extends ExternalAttachmentError:
    val message = "Attachment not found"
  case object SectionQuestionNotFound extends ExternalAttachmentError:
    val message = "Section question not found"
  case object QuestionAnswerNotFound extends ExternalAttachmentError:
    val message = "Question answer not found"
  case object CouldNotDeserializeExam extends ExternalAttachmentError:
    val message = "Could not deserialize exam"
  case object MissingFile extends ExternalAttachmentError:
    val message = "Missing file"
  case object MissingExamIdOrQuestionId extends ExternalAttachmentError:
    val message = "Missing examId or questionId"
  case object ExternalIdNotFound extends ExternalAttachmentError:
    val message = "External id not found"
