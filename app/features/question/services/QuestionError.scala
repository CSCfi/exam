// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.question.services

sealed trait QuestionError:
  def message: String

object QuestionError:
  case object QuestionNotFound extends QuestionError:
    override val message: String = "Question not found"
  case object AccessForbidden extends QuestionError:
    override val message: String = "i18n_error_access_forbidden"
  case object UserNotFound extends QuestionError:
    override val message: String = "User not found"
  case object InvalidRequest extends QuestionError:
    override val message: String = "Invalid request"
  case object QuestionInUse extends QuestionError:
    override val message: String = "Question is in use in active exams"
  case object FileNotFound extends QuestionError:
    override val message: String = "file not found"
  case object ValidationError extends QuestionError:
    override val message: String = "Validation error"
  case class ValidationErrorWithMessage(validationMessage: String) extends QuestionError:
    override val message: String = validationMessage
