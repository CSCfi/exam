// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.services

sealed trait ExamError

object ExamError:
  case object NotFound                                extends ExamError
  case object AccessForbidden                         extends ExamError
  case object ExamRemovalNotPossible                  extends ExamError
  case object FutureReservationsExist                 extends ExamError
  case object CourseNotActive                         extends ExamError
  case object NoRequiredSoftwares                     extends ExamError
  case object ExecutionTypeNotFound                   extends ExamError
  case object UnsupportedExecutionType                extends ExamError
  case object NoPermissionToCreateByodExam            extends ExamError
  case class ValidationError(message: String)         extends ExamError
  case class UpdateError(result: play.api.mvc.Result) extends ExamError
