// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.services

sealed trait ExaminationError

object ExaminationError:
  case object ExamNotFound                    extends ExaminationError
  case object QuestionNotFound                extends ExaminationError
  case object EnrolmentNotFound               extends ExaminationError
  case object ParticipationNotFound           extends ExaminationError
  case object ReservationNotFound             extends ExaminationError
  case object ReservationMachineNotFound      extends ExaminationError
  case object RoomNotFound                    extends ExaminationError
  case object InvalidExamState                extends ExaminationError
  case object WrongExamMachine                extends ExaminationError
  case object FailedToCreateExam              extends ExaminationError
  case class ValidationError(message: String) extends ExaminationError
