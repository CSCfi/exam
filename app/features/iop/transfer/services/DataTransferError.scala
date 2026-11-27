// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

sealed trait DataTransferError:
  def message: String

object DataTransferError:
  case object QuestionNotFound extends DataTransferError:
    val message = "Question not found"
  case object FileNotFound extends DataTransferError:
    val message = "file not found"
  case object FileTooLarge extends DataTransferError:
    val message = "i18n_file_too_large"
  case object ErrorCreatingAttachment extends DataTransferError:
    val message = "i18n_error_creating_attachment"
  case object UserNotRecognized extends DataTransferError:
    val message = "User not recognized"
  case class ConnectionError(message: String) extends DataTransferError
