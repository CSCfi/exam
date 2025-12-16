// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.services

sealed trait ExamOwnerError

object ExamOwnerError:
  case object ExamNotFound    extends ExamOwnerError
  case object UserNotFound    extends ExamOwnerError
  case object AccessForbidden extends ExamOwnerError
