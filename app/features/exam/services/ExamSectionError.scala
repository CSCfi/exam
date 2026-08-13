// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.services

sealed trait ExamSectionError

object ExamSectionError:
  case object ExamNotFound                    extends ExamSectionError
  case object SectionNotFound                 extends ExamSectionError
  case object QuestionNotFound                extends ExamSectionError
  case object SectionQuestionNotFound         extends ExamSectionError
  case object AccessForbidden                 extends ExamSectionError
  case object FutureReservationsExist         extends ExamSectionError
  case object AutoEvaluationEssayQuestion     extends ExamSectionError
  case object QuestionAlreadyInSection        extends ExamSectionError
  case object MissingSequenceNumber           extends ExamSectionError
  case object MissingQuestions                extends ExamSectionError
  case object MissingFromOrTo                 extends ExamSectionError
  case object MissingOptionsArray             extends ExamSectionError
  case object CorrectOptionRequired           extends ExamSectionError
  case object IncorrectClaimQuestionOptions   extends ExamSectionError
  case class ValidationError(message: String) extends ExamSectionError
