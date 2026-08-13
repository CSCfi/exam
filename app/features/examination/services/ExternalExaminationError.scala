// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.services

sealed trait ExternalExaminationError

object ExternalExaminationError:
  case object ExternalExamNotFound            extends ExternalExaminationError
  case object EnrolmentNotFound               extends ExternalExaminationError
  case object QuestionNotFound                extends ExternalExaminationError
  case object DeserializationFailed           extends ExternalExaminationError
  case object SerializationFailed             extends ExternalExaminationError
  case object ValidationFailed                extends ExternalExaminationError
  case object VersionConflict                 extends ExternalExaminationError
  case class ValidationError(message: String) extends ExternalExaminationError
